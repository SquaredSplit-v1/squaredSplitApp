// Canonical re-export — all imports of '@/lib/supabase' resolve to the same
// singleton instance as '@/lib/supabase/client', preventing dual-client bugs.
export { supabase } from './supabase/client'
