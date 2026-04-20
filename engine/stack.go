package engine

import "slices"

type Stack[T any] struct {
	items []T
}

func NewStack[T any](items []T) Stack[T] {
	cloned := slices.Clone(items)
	return Stack[T]{items: cloned}
}

func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
	if len(s.items) == 0 {
		var zero T
		return zero, false
	}

	last := len(s.items) - 1
	v := s.items[last]

	var zero T
	s.items[last] = zero
	s.items = s.items[:last]

	return v, true
}
