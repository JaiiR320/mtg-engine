package main

import (
	"fmt"
	"mtgengine-prototype/engine"
)

func printGameState(game *engine.Game) {
	activePlayer := game.Players[game.ActivePlayer]
	opponent := game.Players[(game.ActivePlayer+1)%len(game.Players)]

	fmt.Println("#")
	fmt.Printf("turn %d\n", game.Turn)
	fmt.Printf("active player: %s\n", activePlayer.Name)
	fmt.Printf("%s: life=%d mana=%d hand=%d battlefield=%d graveyard=%d\n", activePlayer.Name, activePlayer.Life, activePlayer.Mana, len(activePlayer.Hand), len(activePlayer.Battlefield), len(activePlayer.Graveyard))
	fmt.Printf("%s: life=%d mana=%d hand=%d battlefield=%d graveyard=%d\n", opponent.Name, opponent.Life, opponent.Mana, len(opponent.Hand), len(opponent.Battlefield), len(opponent.Graveyard))
	if game.LastResolvedActionLog != "" {
		fmt.Printf("last action: %s\n", game.LastResolvedActionLog)
	}
	printHand(activePlayer.Hand)
	printBattlefield(activePlayer.Battlefield)
}

func printHand(hand []engine.Card) {
	fmt.Println("hand:")
	for i, card := range hand {
		fmt.Printf("  [%d] %s\n", i, describeCard(card))
	}
}

func printBattlefield(battlefield []engine.Permanent) {
	fmt.Println("battlefield:")
	for i, permanent := range battlefield {
		status := "untapped"
		if permanent.Tapped {
			status = "tapped"
		}
		fmt.Printf("  [%d] %s (%s)\n", i, permanent.Card.Name, status)
	}
}

func describeAction(game *engine.Game, action engine.Action) string {
	activePlayer := game.Players[game.ActivePlayer]

	switch action.Type {
	case engine.ActionTypePlayLand:
		return fmt.Sprintf("play %s from hand[%d]", activePlayer.Hand[action.HandIndex].Name, action.HandIndex)
	case engine.ActionTypeActivateAbility:
		return fmt.Sprintf("tap %s on battlefield[%d] for 1 mana", activePlayer.Battlefield[action.BattlefieldIndex].Card.Name, action.BattlefieldIndex)
	case engine.ActionTypeCastSpell:
		return fmt.Sprintf("cast %s from hand[%d] for %d mana", activePlayer.Hand[action.HandIndex].Name, action.HandIndex, activePlayer.Hand[action.HandIndex].Cost)
	case engine.ActionTypePass:
		return "pass"
	default:
		return string(action.Type)
	}
}

func describeCard(card engine.Card) string {
	if card.Type == engine.CardTypeLand {
		return fmt.Sprintf("%s [%s]", card.Name, card.Type)
	}

	if card.Ability == nil {
		return fmt.Sprintf("%s [%s] cost=%d", card.Name, card.Type, card.Cost)
	}

	return fmt.Sprintf("%s [%s] cost=%d effect=%s amount=%d", card.Name, card.Type, card.Cost, card.Ability.Effect, card.Ability.Amount)
}
