package clipboard

import (
	"errors"
	"testing"
)

func TestCopyConfirmsTheClipboard(t *testing.T) {
	var stored string
	c := Verified{
		Set: func(text string) error { stored = text; return nil },
		Get: func() (string, error) { return stored, nil },
	}
	if err := c.Copy("line 1\n\tline 2 🚀"); err != nil {
		t.Fatalf("copy: %v", err)
	}
}

func TestCopyReportsEachFailure(t *testing.T) {
	boom := errors.New("boom")
	cases := map[string]struct {
		c    Verified
		want error
	}{
		"set fails":     {Verified{Set: func(string) error { return boom }, Get: func() (string, error) { return "", nil }}, boom},
		"read fails":    {Verified{Set: func(string) error { return nil }, Get: func() (string, error) { return "", boom }}, boom},
		"text replaced": {Verified{Set: func(string) error { return nil }, Get: func() (string, error) { return "other", nil }}, ErrChanged},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			if err := tc.c.Copy("prompt"); !errors.Is(err, tc.want) {
				t.Errorf("err = %v, want %v", err, tc.want)
			}
		})
	}
}
