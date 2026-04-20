package engine

import "math/rand/v2"

func NewPlayer(name string, deck []Card) Player {
	return Player{
		Name:    name,
		Life:    10,
		Library: NewStack(deck),
	}
}

func SampleDeck() []Card {
	deck := []Card{
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Mountain", Type: CardTypeLand},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Spark", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 1}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Flare", Type: CardTypeSorcery, Cost: 2, Ability: &Ability{Effect: AbilityEffectDealDamage, Amount: 2}},
		{Name: "Insight", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDrawCards, Amount: 1}},
		{Name: "Insight", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDrawCards, Amount: 1}},
		{Name: "Insight", Type: CardTypeSorcery, Cost: 1, Ability: &Ability{Effect: AbilityEffectDrawCards, Amount: 1}},
	}

	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})

	return deck
}
