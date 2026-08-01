import {
  CORE_PACKAGE_NAME,
  CORE_PACKAGE_URL,
  CORE_PACKAGE_VERSION,
  CURRENT_RELEASE,
  CURRENT_RELEASE_URL,
} from "@/site/constants/site"

export const DISTRIBUTION_LAYERS = [
  {
    title: "Editable registry UI",
    description:
      "The shadcn command copies the calculator and its four built-in modes into your project.",
  },
  {
    title: "Focused calculation core",
    description:
      "The installed component brings a dependency-free package for expression, graphing, statistics, and tools logic.",
  },
] as const

export const RELEASE_LINKS = [
  {
    label: "Published core",
    value: `${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}`,
    href: CORE_PACKAGE_URL,
  },
  {
    label: "Release notes",
    value: CURRENT_RELEASE,
    href: CURRENT_RELEASE_URL,
  },
] as const
