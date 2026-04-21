package engine

import "fmt"

func (g *Game) applyPlayLand(action Action) error {
	player := g.priorityPlayerPtr()
	card, ok := removeAt(player.Hand, action.HandIndex)
	if !ok {
		return fmt.Errorf("hand index %d out of range", action.HandIndex)
	}

	player.Hand = card.remaining
	player.Battlefield = append(player.Battlefield, Permanent{Card: card.value})
	g.LandPlayedThisTurn = true
	g.resetPriorityTo(g.PriorityPlayer)
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s plays %s and keeps priority", g.Turn, player.Name, card.value.Name)
	return nil
}

func (g *Game) applyActivateAbility(action Action) error {
	player := g.priorityPlayerPtr()
	player.Battlefield[action.BattlefieldIndex].Tapped = true
	player.Mana++
	g.resetPriorityTo(g.PriorityPlayer)
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
	g.pushSpellToStack(card.value, g.PriorityPlayer)
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s casts %s to the stack and keeps priority", g.Turn, player.Name, card.value.Name)
	return nil
}
