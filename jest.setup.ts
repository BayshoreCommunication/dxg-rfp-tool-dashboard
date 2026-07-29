import '@testing-library/jest-dom'

// Feature gates default to on under test so suites exercise real behaviour; a
// test that cares about a closed gate sets the flag itself.
process.env.NEXT_PUBLIC_CONVERSATION_EXTRACTION_ENABLED = 'true'
