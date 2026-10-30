export interface ProfileInput {
  email?: string
  discord?: string
  telegram?: string
  x?: string
  description?: string
  website?: string
  identity?: string
  logo_url?: string
}

// The registry file is the source of truth for a profile: a field it does not carry is undefined
// here, and assigning undefined to a stored document unsets the field on the next save.
export function registryProfile(data: ProfileInput): Record<keyof ProfileInput, string | undefined> {
  return {
    email: data.email || undefined,
    discord: data.discord || undefined,
    telegram: data.telegram || undefined,
    x: data.x || undefined,
    description: data.description || undefined,
    website: data.website || undefined,
    identity: data.identity || undefined,
    logo_url: data.logo_url || undefined
  }
}
