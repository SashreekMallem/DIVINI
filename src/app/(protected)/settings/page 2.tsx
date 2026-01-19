'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Mail, 
  Briefcase, 
  MapPin,
  Save,
  Loader2,
  Check
} from 'lucide-react'
import type { User as UserType } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Form state
  const [fullName, setFullName] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [yearsExperience, setYearsExperience] = useState<number>(0)
  const [location, setLocation] = useState('')
  const [jobSearchStatus, setJobSearchStatus] = useState('actively_looking')
  const [remotePreference, setRemotePreference] = useState('flexible')

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (data) {
      setUser(data)
      setFullName(data.full_name || '')
      setCurrentRole(data.current_role || '')
      setTargetRole(data.target_role || '')
      setYearsExperience(data.years_experience || 0)
      setLocation(data.location || '')
      setJobSearchStatus(data.job_search_status || 'actively_looking')
      setRemotePreference(data.remote_preference || 'flexible')
    }
    
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        current_role: currentRole,
        target_role: targetRole,
        years_experience: yearsExperience,
        location,
        job_search_status: jobSearchStatus,
        remote_preference: remotePreference,
      })
      .eq('id', user?.id)
    
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          Profile Information
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Email
            </label>
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/30 border border-white/5 rounded-xl">
              <Mail className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-400">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Career Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-green-400" />
          Career Information
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Current Role
              </label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="Software Engineer"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Senior Software Engineer"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Job Search Status
            </label>
            <select
              value={jobSearchStatus}
              onChange={(e) => setJobSearchStatus(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="actively_looking">Actively Looking</option>
              <option value="casually_looking">Casually Looking</option>
              <option value="employed_open">Employed but Open</option>
              <option value="not_looking">Not Looking</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          Location & Preferences
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Remote Preference
            </label>
            <select
              value={remotePreference}
              onChange={(e) => setRemotePreference(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site Only</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 rounded-xl font-medium transition-colors"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}

