package engine

import "fmt"

func (g *Game) pushSpellToStack(card Card, controller int) {
	g.Stack = append(g.Stack, StackObject{Controller: controller, Card: card})
	g.resetPriorityTo(controller)
}

func (g *Game) resolveTopOfStack() string {
	stackObject := g.Stack[len(g.Stack)-1]
	g.Stack = g.Stack[:len(g.Stack)-1]

	controller := &g.Players[stackObject.Controller]
	log := fmt.Sprintf("%s resolves", stackObject.Card.Name)
	if stackObject.Card.Ability != nil {
		log = log + "; " + g.resolveAbility(stackObject.Controller, *stackObject.Card.Ability)
	}
	controller.Graveyard = append(controller.Graveyard, stackObject.Card)

	if g.GameOver {
		return log
	}

	g.resetPriorityTo(g.ActivePlayer)
	return fmt.Sprintf("%s; %s receives priority", log, g.Players[g.PriorityPlayer].Name)
}
