package engine

import "fmt"

func (g *Game) applyPassPriority() error {
	player := g.priorityPlayerPtr()
	log := fmt.Sprintf("turn %d: %s passes priority", g.Turn, player.Name)
	g.ConsecutivePasses++

	if g.ConsecutivePasses == len(g.Players) {
		if len(g.Stack) > 0 {
			g.LastResolvedActionLog = log + "; " + g.resolveTopOfStack()
			return nil
		}

		if err := g.advancePhaseOrTurn(); err != nil {
			return err
		}
		g.LastResolvedActionLog = log + "; " + g.LastResolvedActionLog
		return nil
	}

	g.PriorityPlayer = g.nextPlayer(g.PriorityPlayer)
	g.LastResolvedActionLog = fmt.Sprintf("%s; %s receives priority", log, g.Players[g.PriorityPlayer].Name)
	return nil
}

func (g *Game) advancePhaseOrTurn() error {
	if g.GameOver {
		return nil
	}

	switch g.Phase {
	case PhaseDraw:
		g.enterMainPhase()
		g.LastResolvedActionLog = fmt.Sprintf("turn %d: main phase begins; %s receives priority", g.Turn, g.Players[g.PriorityPlayer].Name)
	case PhaseMain:
		g.endTurn()
		g.startTurn()
	default:
		return fmt.Errorf("unknown phase %q", g.Phase)
	}

	return nil
}

func (g *Game) startTurn() {
	g.Turn++
	g.Phase = PhaseDraw
	player := g.activePlayerPtr()
	for i := range player.Battlefield {
		player.Battlefield[i].Tapped = false
	}
	for i := range g.Players {
		g.Players[i].Mana = 0
	}
	g.LandPlayedThisTurn = false
	g.resetPriorityTo(g.ActivePlayer)
	g.drawCard(g.ActivePlayer)
	if g.GameOver {
		g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s starts their turn, enters draw phase, and loses trying to draw from an empty library", g.Turn, player.Name)
		return
	}
	g.LastResolvedActionLog = fmt.Sprintf("turn %d: %s starts their turn, enters draw phase, and draws", g.Turn, player.Name)
}

func (g *Game) enterMainPhase() {
	g.Phase = PhaseMain
	g.resetPriorityTo(g.ActivePlayer)
}

func (g *Game) endTurn() {
	for i := range g.Players {
		g.Players[i].Mana = 0
	}
	g.ActivePlayer = g.nextPlayer(g.ActivePlayer)
	g.resetPriorityTo(g.ActivePlayer)
}
