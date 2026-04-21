package engine

const openingHandSize = 3

type CardType string

const (
	CardTypeLand    CardType = "land"
	CardTypeInstant CardType = "instant"
	CardTypeSorcery CardType = "sorcery"
)

type AbilityEffect string

const (
	AbilityEffectDealDamage AbilityEffect = "deal_damage"
	AbilityEffectDrawCards  AbilityEffect = "draw_cards"
)

type ActionType string

const (
	ActionTypePlayLand        ActionType = "play_land"
	ActionTypeActivateAbility ActionType = "activate_ability"
	ActionTypeCastSpell       ActionType = "cast_spell"
	ActionTypePassPriority    ActionType = "pass_priority"
)

type Phase string

const (
	PhaseDraw Phase = "draw"
	PhaseMain Phase = "main"
)

type Card struct {
	Name    string
	Cost    int
	Type    CardType
	Ability *Ability
}

type Ability struct {
	Effect AbilityEffect
	Amount int
}

type Permanent struct {
	Card   Card
	Tapped bool
}

type StackObject struct {
	Controller int
	Card       Card
}

type Player struct {
	Name        string
	Life        int
	Mana        int
	Battlefield []Permanent
	Hand        []Card
	Library     Stack[Card]
	Graveyard   []Card
	Lost        bool
	LossReason  string
}

type Action struct {
	Type             ActionType
	HandIndex        int
	BattlefieldIndex int
}

type Game struct {
	Players               []Player
	ActivePlayer          int
	PriorityPlayer        int
	ConsecutivePasses     int
	Phase                 Phase
	Stack                 []StackObject
	Turn                  int
	LandPlayedThisTurn    bool
	WinnerIndex           int
	GameOver              bool
	LastResolvedActionLog string
}
