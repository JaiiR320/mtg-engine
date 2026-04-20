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

func (g *Game) LegalActionsForPlayer(playerIndex int) []Action {
	if g.GameOver || playerIndex < 0 || playerIndex >= len(g.Players) {
		return nil
	}
	if playerIndex != g.PriorityPlayer {
		return nil
	}

	player := &g.Players[playerIndex]
	actions := []Action{{Type: ActionTypePassPriority}}

	if g.Phase != PhaseMain {
		return actions
	}

	if playerIndex != g.TurnPlayer {
		return actions
	}

	if !g.LandPlayedThisTurn {
		for handIndex, card := range player.Hand {
			if card.Type != CardTypeLand {
				continue
			}
			actions = append(actions, Action{Type: ActionTypePlayLand, HandIndex: handIndex})
		}
	}

	for _, battlefieldIndex := range g.untappedLandIndexes(playerIndex) {
		actions = append(actions, Action{Type: ActionTypeActivateAbility, BattlefieldIndex: battlefieldIndex})
	}

	for handIndex, card := range player.Hand {
		if card.Type != CardTypeSorcery || card.Cost > player.Mana {
			continue
		}
		actions = append(actions, Action{Type: ActionTypeCastSpell, HandIndex: handIndex})
	}

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
	case ActionTypePassPriority:
		return g.applyPassPriority()
	default:
		return fmt.Errorf("unknown action type %q", action.Type)
	}
}

func (g *Game) applyPlayLand(action Action) error {
	player := g.priorityPlayerPtr()
	card, ok := removeAt(player.Hand, action.HandIndex)
	if !ok {
		return fmt.Errorf("hand index %d out of range", action.HandIndex)
	}

	player.Hand = card.remaining
	player.Battlefield = append(player.Battlefield, Permanent{Card: card.value})
	g.LandPlayedThisTurn = true
	g.resetPriorityRound(g.PriorityPlayer)
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s plays %s and keeps priority", g.Turn, player.Name, card.value.Name)
	return nil
}

func (g *Game) applyActivateAbility(action Action) error {
	player := g.priorityPlayerPtr()
	player.Battlefield[action.BattlefieldIndex].Tapped = true
	player.Mana++
	g.resetPriorityRound(g.PriorityPlayer)
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s taps %s for 1 mana and keeps priority", g.Turn, player.Name, player.Battlefield[action.BattlefieldIndex].Card.Name)
	return nil
}

func (g *Game) applyCastSpell(action Action) error {
	player := g.priorityPlayerPtr()
	card, ok := removeAt(player.Hand, action.HandIndex)
	if !ok {
		return fmt.Errorf("hand index %d out of range", action.HandIndex)
	}

	player.Hand = card.remaining
	player.Mana -= card.value.Cost
	player.Graveyard = append(player.Graveyard, card.value)
	g.resetPriorityRound(g.PriorityPlayer)

	log := fmt.Sprintf("turn %d: %s casts %s", g.Turn, player.Name, card.value.Name)
	if card.value.Ability != nil {
		log = log + "; " + g.resolveAbility(g.PriorityPlayer, *card.value.Ability)
	}
	if !g.GameOver {
		log = log + fmt.Sprintf("; %s keeps priority", player.Name)
	}
	g.LastResolvedActionLog = log
	return nil
}

func (g *Game) applyPassPriority() error {
	player := g.priorityPlayerPtr()
	nextPlayer := g.nextPlayer(g.PriorityPlayer)
	log := fmt.Sprintf("turn %d: %s passes priority", g.Turn, player.Name)

	if nextPlayer == g.PriorityRoundStart {
		if err := g.advanceAfterPriorityRound(); err != nil {
			return err
		}
		g.LastResolvedActionLog = log + "; " + g.LastResolvedActionLog
		return nil
	}

	g.PriorityPlayer = nextPlayer
	g.LastResolvedActionLog = fmt.Sprintf("%s; %s receives priority", log, g.Players[g.PriorityPlayer].Name)
	return nil
}

func (g *Game) advanceAfterPriorityRound() error {
	if g.GameOver {
		return nil
	}

	switch g.Phase {
	case PhaseDraw:
		g.enterMainPhase()
		g.LastResolvedActionLog = fmt.Sprintf("turn %d: main phase begins; %s receives priority", g.Turn, g.Players[g.PriorityPlayer].Name)
	case PhaseMain:
		g.endTurn()
		if g.GameOver {
			g.LastResolvedActionLog = fmt.Sprintf("turn %d: main phase ends", g.Turn)
			return nil
		}
		g.startTurn()
	default:
		return fmt.Errorf("unknown phase %q", g.Phase)
	}

	return nil
}

func (g *Game) startTurn() {
	g.Turn++
	g.Phase = PhaseDraw
	player := g.turnPlayerPtr()
	for i := range player.Battlefield {
		player.Battlefield[i].Tapped = false
	}
	for i := range g.Players {
		g.Players[i].Mana = 0
	}
	g.LandPlayedThisTurn = false
	g.resetPriorityRound(g.TurnPlayer)
	g.drawCard(g.TurnPlayer)
	if g.GameOver {
		g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s starts their turn, enters draw phase, and loses trying to draw from an empty library", g.Turn, player.Name)
		return
	}
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s starts their turn, enters draw phase, and draws", g.Turn, player.Name)
}

func (g *Game) enterMainPhase() {
	g.Phase = PhaseMain
	g.resetPriorityRound(g.TurnPlayer)
}

func (g *Game) endTurn() {
	for i := range g.Players {
		g.Players[i].Mana = 0
	}
	g.TurnPlayer = g.nextPlayer(g.TurnPlayer)
	g.PriorityPlayer = g.TurnPlayer
	g.PriorityRoundStart = g.TurnPlayer
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
	for _, legalAction := range g.LegalActionsForPlayer(g.PriorityPlayer) {
		if actionsEqual(legalAction, action) {
			return true
		}
	}
	return false
}

func (g *Game) TurnPlayerIndex() int {
	return g.TurnPlayer
}

func (g *Game) PriorityPlayerIndex() int {
	return g.PriorityPlayer
}

func (g *Game) turnPlayerPtr() *Player {
	return &g.Players[g.TurnPlayer]
}

func (g *Game) priorityPlayerPtr() *Player {
	return &g.Players[g.PriorityPlayer]
}

func (g *Game) nextOpponent(playerIndex int) int {
	return g.nextPlayer(playerIndex)
}

func (g *Game) nextPlayer(playerIndex int) int {
	return (playerIndex + 1) % len(g.Players)
}

func (g *Game) resetPriorityRound(playerIndex int) {
	g.PriorityPlayer = playerIndex
	g.PriorityRoundStart = playerIndex
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
	case ActionTypePassPriority:
		return "pass priority"
	default:
		return string(action.Type)
	}
}
