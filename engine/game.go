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
	return g.legalActionsForPriorityPlayer(playerIndex)
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

func (g *Game) ActivePlayerIndex() int {
	return g.ActivePlayer
}

func (g *Game) PriorityPlayerIndex() int {
	return g.PriorityPlayer
}

func (g *Game) activePlayerPtr() *Player {
	return &g.Players[g.ActivePlayer]
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

func (g *Game) resetPriorityTo(playerIndex int) {
	g.PriorityPlayer = playerIndex
	g.ConsecutivePasses = 0
}

func (g *Game) isLegalAction(action Action) bool {
	for _, legalAction := range g.LegalActionsForPlayer(g.PriorityPlayer) {
		if actionsEqual(legalAction, action) {
			return true
		}
	}
	return false
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
