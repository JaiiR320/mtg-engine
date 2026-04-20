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

type actionRequest struct {
	PlayerIndex int
	Revision    int
	Actions     []engine.Action
}

type submittedAction struct {
	PlayerIndex int
	Revision    int
	Action      engine.Action
}

func main() {
	game := engine.NewGame([]engine.Player{
		engine.NewPlayer("Jair", engine.SampleDeck()),
		engine.NewPlayer("Skyler", engine.SampleDeck()),
	})

	playerRequests := []chan actionRequest{
		make(chan actionRequest),
		make(chan actionRequest),
	}
	submittedActions := make(chan submittedAction)

	scanner := bufio.NewScanner(os.Stdin)

	go func() {
		for req := range playerRequests[0] {
			if len(req.Actions) == 0 {
				continue
			}

			fmt.Print("choose action number: ")
			for {
				if !scanner.Scan() {
					panic("failed to read input")
				}

				input := strings.TrimSpace(scanner.Text())
				choice, err := strconv.Atoi(input)
				if err != nil || choice < 0 || choice >= len(req.Actions) {
					fmt.Print("invalid choice, enter a listed number: ")
					continue
				}

				submittedActions <- submittedAction{
					PlayerIndex: req.PlayerIndex,
					Revision:    req.Revision,
					Action:      req.Actions[choice],
				}
				break
			}
		}
	}()

	go func() {
		for req := range playerRequests[1] {
			if len(req.Actions) == 0 {
				continue
			}

			var preferred []engine.Action
			for _, action := range req.Actions {
				if action.Type == engine.ActionTypePassPriority {
					continue
				}
				preferred = append(preferred, action)
			}

			chosenAction := req.Actions[0]
			if len(preferred) > 0 {
				chosenAction = preferred[rand.IntN(len(preferred))]
			}

			submittedActions <- submittedAction{
				PlayerIndex: req.PlayerIndex,
				Revision:    req.Revision,
				Action:      chosenAction,
			}
		}
	}()

	revision := 0
	for !game.IsOver() {
		revision++
		printGameState(game)

		actionsByPlayer := make([][]engine.Action, len(game.Players))
		for playerIndex := range game.Players {
			actionsByPlayer[playerIndex] = game.LegalActionsForPlayer(playerIndex)
		}

		for playerIndex := range game.Players {
			fmt.Printf("legal actions for %s:\n", game.Players[playerIndex].Name)
			for i, action := range actionsByPlayer[playerIndex] {
				fmt.Printf("  %d. %s\n", i, describeAction(game, playerIndex, action))
			}
		}

		for playerIndex := range game.Players {
			playerRequests[playerIndex] <- actionRequest{
				PlayerIndex: playerIndex,
				Revision:    revision,
				Actions:     actionsByPlayer[playerIndex],
			}
		}

		for {
			submitted := <-submittedActions
			if submitted.Revision != revision {
				continue
			}
			if submitted.PlayerIndex != game.PriorityPlayerIndex() {
				continue
			}

			if submitted.PlayerIndex == 1 {
				fmt.Printf("Skyler chooses: %s\n", describeAction(game, submitted.PlayerIndex, submitted.Action))
			}

			if err := game.Apply(submitted.Action); err != nil {
				panic(err)
			}
			fmt.Println(game.LastResolvedActionLog)
			fmt.Println()
			break
		}
	}

	for _, requests := range playerRequests {
		close(requests)
	}

	winner, ok := game.Winner()
	if !ok {
		fmt.Println("game ended without a winner")
		return
	}

	loser := game.Players[(game.WinnerIndex+1)%len(game.Players)]
	fmt.Printf("winner: %s\n", winner.Name)
	fmt.Printf("loser: %s (%s)\n", loser.Name, loser.LossReason)
}
