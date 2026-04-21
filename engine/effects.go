package engine

import "fmt"

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
