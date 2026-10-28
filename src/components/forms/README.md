These field components support public/authentication screens and legacy product styling.

Admin child features, purchases, orders, and returns own their field markup and
styles inside their feature folders. Change a feature's local LabeledTextField
or Field.styles when its appearance needs to change. Do not import this shared
field component into those features or create cross-feature form components.

Preserve the separate label, accessible input association, validation feedback,
and keyboard behavior when changing a feature's local field.
