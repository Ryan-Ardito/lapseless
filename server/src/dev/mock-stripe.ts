// Mock Stripe behavior for dev mode
// In dev, all users get 'professional' tier
// Checkout and portal return mock redirect URLs
// This is handled inline in routes/stripe.ts via env.isDev checks
