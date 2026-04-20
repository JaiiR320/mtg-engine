package main

import (
	"bufio"
	"fmt"
	"math/rand/v2"
	"mtgengine-prototype/engine"
	"os"
	"strconv"
	"strings"
)

func main() {
	game := engine.NewGame([]engine.Player{
		engine.NewPlayer("Jair", engine.SampleDeck()),
		engine.NewPlayer("Skyler", engine.SampleDeck()),
	})
	legalActionsCh := make(chan []engine.Action)
	aiChosenActionCh := make(chan engine.Action)

	// Skyler AI
	go func() {
		for actions := range legalActionsCh {
			var preferred []engine.Action
			for _, action := range actions {
				if action.Type == engine.ActionTypePass {
					continue
				}
				preferred = append(preferred, action)
			}

			if len(preferred) > 0 {
				aiChosenActionCh <- preferred[rand.IntN(len(preferred))]
				continue
			}

			aiChosenActionCh <- actions[0]
		}
	}()

	scanner := bufio.NewScanner(os.Stdin)

	for !game.IsOver() {
		actions := game.LegalActions()
		printGameState(game)
		fmt.Println("legal actions:")
		for i, action := range actions {
			fmt.Printf("  %d. %s\n", i, describeAction(game, action))
		}

		activePlayer := game.Players[game.ActivePlayer]
		if activePlayer.Name == "Skyler" {
			legalActionsCh <- actions
			action := <-aiChosenActionCh
			fmt.Printf("Skyler chooses: %s\n", describeAction(game, action))
			if err := game.Apply(action); err != nil {
				panic(err)
			}
			fmt.Println(game.LastResolvedActionLog)
			fmt.Println()
			continue
		}

		fmt.Print("choose action number: ")
		for {
			if !scanner.Scan() {
				panic("failed to read input")
			}

			input := strings.TrimSpace(scanner.Text())
			choice, err := strconv.Atoi(input)
			if err != nil || choice < 0 || choice >= len(actions) {
				fmt.Print("invalid choice, enter a listed number: ")
				continue
			}

			action := actions[choice]
			if err := game.Apply(action); err != nil {
				panic(err)
			}
			fmt.Println(game.LastResolvedActionLog)
			fmt.Println()
			break
		}
	}

	close(legalActionsCh)

	winner, ok := game.Winner()
	if !ok {
		fmt.Println("game ended without a winner")
		return
	}

	loser := game.Players[(game.WinnerIndex+1)%len(game.Players)]
	fmt.Printf("winner: %s\n", winner.Name)
	fmt.Printf("loser: %s (%s)\n", loser.Name, loser.LossReason)
}
