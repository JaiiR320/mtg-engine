package engine

import (
	"errors"
	"fmt"
	"slices"
)

func NewGame(players []Player) *Game {
	game := &Game{
		Players:     slices.Clone(players),
		WinnerIndex: -1,
	}

	for i := range game.Players {
		for range openingHandSize {
			game.drawCard(i)
		}
	}

	if !game.GameOver {
		game.startTurn()
		game.LastResolvedActionLog = fmt.Sprintf("turn %d: %s starts their turn and draws", game.Turn, game.activePlayerPtr().Name)
	}

	return game
}

func (g *Game) IsOver() bool {
	return g.GameOver
}

func (g *Game) Winner() (Player, bool) {
	if g.WinnerIndex < 0 || g.WinnerIndex >= len(g.Players) {
		return Player{}, false
	}
	return g.Players[g.WinnerIndex], true
}

func (g *Game) LegalActions() []Action {
	if g.GameOver {
		return nil
	}

	player := g.activePlayerPtr()
	var actions []Action

	if !g.LandPlayedThisTurn {
		for handIndex, card := range player.Hand {
			if card.Type != CardTypeLand {
				continue
			}
			actions = append(actions, Action{Type: ActionTypePlayLand, HandIndex: handIndex})
		}
	}

	untappedLandIndexes := g.untappedLandIndexes(g.ActivePlayer)
	for _, battlefieldIndex := range untappedLandIndexes {
		actions = append(actions, Action{Type: ActionTypeActivateAbility, BattlefieldIndex: battlefieldIndex})
	}

	for handIndex, card := range player.Hand {
		if card.Type != CardTypeSorcery || card.Cost > player.Mana {
			continue
		}
		actions = append(actions, Action{Type: ActionTypeCastSpell, HandIndex: handIndex})
	}

	actions = append(actions, Action{Type: ActionTypePass})
	return actions
}

func (g *Game) Apply(action Action) error {
	if g.GameOver {
		return errors.New("game is over")
	}

	if !g.isLegalAction(action) {
		return fmt.Errorf("illegal action: %s", g.describeAction(action))
	}

	switch action.Type {
	case ActionTypePlayLand:
		return g.applyPlayLand(action)
	case ActionTypeActivateAbility:
		return g.applyActivateAbility(action)
	case ActionTypeCastSpell:
		return g.applyCastSpell(action)
	case ActionTypePass:
		return g.applyPass()
	default:
		return fmt.Errorf("unknown action type %q", action.Type)
	}
}

func (g *Game) applyPlayLand(action Action) error {
	player := g.activePlayerPtr()
	card, ok := removeAt(player.Hand, action.HandIndex)
	if !ok {
		return fmt.Errorf("hand index %d out of range", action.HandIndex)
	}
	player.Hand = card.remaining
	player.Battlefield = append(player.Battlefield, Permanent{Card: card.value})
	g.LandPlayedThisTurn = true
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s plays %s", g.Turn, player.Name, card.value.Name)
	return nil
}

func (g *Game) applyActivateAbility(action Action) error {
	player := g.activePlayerPtr()
	player.Battlefield[action.BattlefieldIndex].Tapped = true
	player.Mana++
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s taps %s for 1 mana", g.Turn, player.Name, player.Battlefield[action.BattlefieldIndex].Card.Name)
	return nil
}

func (g *Game) applyCastSpell(action Action) error {
	player := g.activePlayerPtr()
	card, ok := removeAt(player.Hand, action.HandIndex)
	if !ok {
		return fmt.Errorf("hand index %d out of range", action.HandIndex)
	}
	player.Hand = card.remaining
	player.Mana -= card.value.Cost
	player.Graveyard = append(player.Graveyard, card.value)
	log := fmt.Sprintf("turn %d: %s casts %s", g.Turn, player.Name, card.value.Name)
	if card.value.Ability != nil {
		log = log + "; " + g.resolveAbility(g.ActivePlayer, *card.value.Ability)
	}
	g.LastResolvedActionLog = log
	return nil
}

func (g *Game) applyPass() error {
	player := g.activePlayerPtr()
	player.Mana = 0
	log := fmt.Sprintf("turn %d: %s passes", g.Turn, player.Name)
	g.ActivePlayer = (g.ActivePlayer + 1) % len(g.Players)
	if !g.GameOver {
		g.startTurn()
		if g.GameOver {
			g.LastResolvedActionLog = log
			return nil
		}
		log = fmt.Sprintf("%s; turn %d: %s starts their turn and draws", log, g.Turn, g.activePlayerPtr().Name)
	}
	g.LastResolvedActionLog = log
	return nil
}

func (g *Game) startTurn() {
	g.Turn++
	player := g.activePlayerPtr()
	for i := range player.Battlefield {
		player.Battlefield[i].Tapped = false
	}
	player.Mana = 0
	g.LandPlayedThisTurn = false
	g.drawCard(g.ActivePlayer)
}

func (g *Game) drawCard(playerIndex int) {
	if g.GameOver {
		return
	}

	card, ok := g.Players[playerIndex].Library.Pop()
	if !ok {
		g.lose(playerIndex, "tried to draw from an empty library")
		return
	}
	g.Players[playerIndex].Hand = append(g.Players[playerIndex].Hand, card)
}

func (g *Game) resolveAbility(casterIndex int, ability Ability) string {
	switch ability.Effect {
	case AbilityEffectDealDamage:
		target := g.nextOpponent(casterIndex)
		g.Players[target].Life -= ability.Amount
		if g.Players[target].Life <= 0 {
			g.lose(target, "life reached 0")
		}
		return fmt.Sprintf("deals %d damage to %s", ability.Amount, g.Players[target].Name)
	case AbilityEffectDrawCards:
		for range ability.Amount {
			g.drawCard(casterIndex)
			if g.GameOver {
				break
			}
		}
		return fmt.Sprintf("draws %d card(s)", ability.Amount)
	default:
		return "does nothing"
	}
}

func (g *Game) lose(playerIndex int, reason string) {
	g.Players[playerIndex].Lost = true
	g.Players[playerIndex].LossReason = reason
	g.GameOver = true
	for i := range g.Players {
		if i != playerIndex {
			g.WinnerIndex = i
			return
		}
	}
	g.WinnerIndex = -1
}

func (g *Game) isLegalAction(action Action) bool {
	for _, legalAction := range g.LegalActions() {
		if actionsEqual(legalAction, action) {
			return true
		}
	}
	return false
}

func (g *Game) activePlayerPtr() *Player {
	return &g.Players[g.ActivePlayer]
}

func (g *Game) nextOpponent(playerIndex int) int {
	return (playerIndex + 1) % len(g.Players)
}

func (g *Game) untappedLandIndexes(playerIndex int) []int {
	player := g.Players[playerIndex]
	var indexes []int
	for i, permanent := range player.Battlefield {
		if permanent.Card.Type == CardTypeLand && !permanent.Tapped {
			indexes = append(indexes, i)
		}
	}
	return indexes
}

func (g *Game) describeAction(action Action) string {
	switch action.Type {
	case ActionTypePlayLand:
		return fmt.Sprintf("play land from hand index %d", action.HandIndex)
	case ActionTypeActivateAbility:
		return fmt.Sprintf("tap battlefield index %d", action.BattlefieldIndex)
	case ActionTypeCastSpell:
		return fmt.Sprintf("cast spell from hand index %d", action.HandIndex)
	case ActionTypePass:
		return "pass"
	default:
		return string(action.Type)
	}
}
