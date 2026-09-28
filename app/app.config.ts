import { smallerIcons, thinStroke } from './theme/icons'

export default defineAppConfig({
  icon: {
    customize: thinStroke,
  },
  ui: {
    colors: {
      primary: 'yellow',
      neutral: 'zinc',
    },
    sidebar: {
      slots: {
        header: 'px-3',
        body: 'px-3 py-2',
        footer: 'px-3',
      },
    },
    // Lighter icons: one size step below Nuxt UI's defaults (see theme/icons.ts).
    button: smallerIcons('leadingIcon', 'trailingIcon'),
    input: smallerIcons('leadingIcon', 'trailingIcon'),
    tabs: smallerIcons('leadingIcon'),
    select: smallerIcons('leadingIcon', 'trailingIcon', 'itemLeadingIcon', 'itemTrailingIcon'),
    selectMenu: smallerIcons('leadingIcon', 'trailingIcon', 'itemLeadingIcon', 'itemTrailingIcon'),
    inputMenu: smallerIcons('leadingIcon', 'trailingIcon', 'itemLeadingIcon', 'itemTrailingIcon'),
    dropdownMenu: smallerIcons('itemLeadingIcon', 'itemTrailingIcon'),
    contextMenu: smallerIcons('itemLeadingIcon', 'itemTrailingIcon'),
    commandPalette: smallerIcons('itemLeadingIcon', 'itemTrailingIcon', 'itemTrailingHighlightedIcon'),
    editorSuggestionMenu: smallerIcons('itemLeadingIcon'),
    navigationMenu: {
      slots: { linkLeadingIcon: 'size-4', linkTrailingIcon: 'size-4', childLinkIcon: 'size-4' },
    },
    breadcrumb: {
      slots: { linkLeadingIcon: 'size-4', separatorIcon: 'size-4' },
    },
    accordion: {
      slots: { leadingIcon: 'size-4', trailingIcon: 'size-4' },
    },
  },
})
