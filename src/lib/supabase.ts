
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://offhirdabhbxgjsskqke.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZmhpcmRhYmhieGdqc3NrcWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDAxNTcsImV4cCI6MjA4NTkxNjE1N30.lVyEEwTnC3G5sGFoIAV0GZU5CO50bMoNjt0Udb8Zszo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
