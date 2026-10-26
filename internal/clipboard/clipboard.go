package clipboard

import (
	"errors"
	"fmt"
)

var ErrChanged = errors.New("the clipboard changed before the copy could be confirmed, try again")

type Verified struct {
	Set func(text string) error
	Get func() (string, error)
}

func (c Verified) Copy(text string) error {
	if err := c.Set(text); err != nil {
		return fmt.Errorf("couldn't copy to the clipboard: %w", err)
	}
	got, err := c.Get()
	if err != nil {
		return fmt.Errorf("couldn't confirm the clipboard contents: %w", err)
	}
	if got != text {
		return ErrChanged
	}
	return nil
}
