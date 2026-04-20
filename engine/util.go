package engine

type removeResult[T any] struct {
	value     T
	remaining []T
}

func removeAt[T any](items []T, index int) (removeResult[T], bool) {
	if index < 0 || index >= len(items) {
		var zero removeResult[T]
		return zero, false
	}

	value := items[index]
	remaining := append(items[:index:index], items[index+1:]...)

	return removeResult[T]{value: value, remaining: remaining}, true
}

func actionsEqual(a, b Action) bool {
	return a.Type == b.Type && a.HandIndex == b.HandIndex && a.BattlefieldIndex == b.BattlefieldIndex
}
