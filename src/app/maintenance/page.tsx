import React from 'react'
import { Settings, Mail, Github, Twitter } from 'lucide-react'

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        {/* Animated Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <Settings className="w-full h-full text-blue-600 animate-spin-slow" />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
            Under Maintenance
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We&apos;re performing scheduled maintenance to improve our services.
            We&apos;ll be back online shortly.
          </p>

          {/* Progress Indicator */}
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-progress" />
          </div>
          
          <p className="text-sm text-gray-500">
            Estimated time remaining: ~2 hours
          </p>

          {/* Contact Card */}
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Need assistance?
            </h2>
            <div className="flex items-center justify-center gap-4">
              <a href="mailto:support@example.com" className="p-2 text-gray-600 hover:text-blue-600">
                <Mail className="w-6 h-6" />
              </a>
              <a href="https://github.com" className="p-2 text-gray-600 hover:text-gray-900">
                <Github className="w-6 h-6" />
              </a>
              <a href="https://twitter.com" className="p-2 text-gray-600 hover:text-blue-400">
                <Twitter className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Maintenance