import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, LayoutDashboard, History, Zap, ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm mb-6 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-4 w-4" />
            AI-Powered Team Status Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
            Keep your finger on the pulse
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Voice-first status updates, AI-powered insights, and a dashboard that tells you what
            matters. Stop chasing updates, start understanding your team.
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          <Card className="group relative overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Mic className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Submit Update</CardTitle>
              <CardDescription className="text-slate-500">
                Record your status with voice or text. AI extracts key information automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/capture">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25" size="lg">
                  <Mic className="mr-2 h-4 w-4" />
                  Submit Status
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-200/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                <History className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">My Updates</CardTitle>
              <CardDescription className="text-slate-500">
                View your own update history. See both what you said and how AI interpreted it.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/me">
                <Button className="w-full" size="lg" variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  View History
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Team Dashboard</CardTitle>
              <CardDescription className="text-slate-500">
                See your team&apos;s pulse at a glance. Blockers, progress, and AI-generated
                insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Link href="/home">
                <Button className="w-full" size="lg" variant="outline">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">How It Works</h2>
            <p className="text-slate-500">Three simple steps to better team visibility</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
                <span className="font-bold text-white">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Speak Naturally</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Just talk about what you&apos;re working on, blockers, and what you need help with.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
                <span className="font-bold text-white">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">AI Extracts Insights</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Claude analyzes your update and extracts completed tasks, blockers, and sentiment.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
                <span className="font-bold text-white">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Track &amp; Review</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                View your history, see team pulse, and managers can generate AI summaries.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-20 text-sm text-slate-400">
          <p>Built with Next.js, Tailwind CSS, and Claude AI</p>
        </div>
      </div>
    </div>
  )
}
