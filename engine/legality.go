package engine

func (g *Game) legalActionsForPriorityPlayer(playerIndex int) []Action {
	player := &g.Players[playerIndex]
	actions := []Action{{Type: ActionTypePassPriority}}

	for _, battlefieldIndex := range g.untappedLandIndexes(playerIndex) {
		actions = append(actions, Action{Type: ActionTypeActivateAbility, BattlefieldIndex: battlefieldIndex})
	}

	for handIndex, card := range player.Hand {
		if g.canPlayLand(playerIndex, card) {
			actions = append(actions, Action{Type: ActionTypePlayLand, HandIndex: handIndex})
			continue
		}
		if g.canCastSpell(playerIndex, card) {
			actions = append(actions, Action{Type: ActionTypeCastSpell, HandIndex: handIndex})
		}
	}

	return actions
}

func (g *Game) canPlayLand(playerIndex int, card Card) bool {
	return card.Type == CardTypeLand && playerIndex == g.ActivePlayer && g.Phase == PhaseMain && len(g.Stack) == 0 && !g.LandPlayedThisTurn
}

func (g *Game) canCastSpell(playerIndex int, card Card) bool {
	if card.Cost > g.Players[playerIndex].Mana {
		return false
	}

	switch card.Type {
	case CardTypeInstant:
		return true
	case CardTypeSorcery:
		return playerIndex == g.ActivePlayer && g.Phase == PhaseMain && len(g.Stack) == 0
	default:
		return false
	}
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
