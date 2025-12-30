'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended'

export default function Home() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            handleUserSpeech(finalTranscript.trim())
          } else {
            setTranscript(interimTranscript)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startCall = () => {
    setCallStatus('connecting')
    setTimeout(() => {
      setCallStatus('active')
      setMessages([])
      setCallDuration(0)

      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)

      const greeting = "Hello! I'm your AI calling agent. How can I help you today?"
      addMessage('assistant', greeting)
      speak(greeting)

      if (recognitionRef.current) {
        recognitionRef.current.start()
        setIsRecording(true)
      }
    }, 1500)
  }

  const endCall = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCallStatus('ended')
    setTimeout(() => {
      setCallStatus('idle')
      setTranscript('')
    }, 2000)
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }])
  }

  const handleUserSpeech = (text: string) => {
    setTranscript('')
    addMessage('user', text)

    setTimeout(() => {
      const response = generateResponse(text)
      addMessage('assistant', response)
      speak(response)
    }, 500)
  }

  const generateResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    if (input.includes('hello') || input.includes('hi')) {
      return "Hello! It's great to hear from you. What can I assist you with?"
    }
    if (input.includes('how are you')) {
      return "I'm functioning perfectly, thank you for asking! How can I help you today?"
    }
    if (input.includes('appointment') || input.includes('schedule')) {
      return "I can help you schedule an appointment. What date and time works best for you?"
    }
    if (input.includes('weather')) {
      return "I can help with weather information. Which location are you interested in?"
    }
    if (input.includes('help')) {
      return "I'm here to assist you with scheduling appointments, answering questions, or providing information. What do you need?"
    }
    if (input.includes('thank')) {
      return "You're very welcome! Is there anything else I can help you with?"
    }
    if (input.includes('bye') || input.includes('goodbye')) {
      return "Goodbye! Have a wonderful day. Feel free to call again anytime!"
    }
    if (input.includes('name')) {
      return "I'm an AI calling agent designed to assist you with various tasks and inquiries."
    }
    if (input.includes('time')) {
      const now = new Date()
      return `The current time is ${now.toLocaleTimeString()}.`
    }
    if (input.includes('date')) {
      const now = new Date()
      return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
    }

    return "I understand. Could you tell me more about what you need assistance with?"
  }

  const speak = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      synthRef.current.speak(utterance)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>AI Calling Agent</h1>

        <div className={styles.callInterface}>
          <div className={styles.statusSection}>
            <div className={`${styles.statusIndicator} ${styles[callStatus]}`}>
              {callStatus === 'idle' && '⏸'}
              {callStatus === 'connecting' && '⟳'}
              {callStatus === 'active' && '●'}
              {callStatus === 'ended' && '✓'}
            </div>
            <div className={styles.statusText}>
              {callStatus === 'idle' && 'Ready to call'}
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'active' && `Active - ${formatDuration(callDuration)}`}
              {callStatus === 'ended' && 'Call ended'}
            </div>
          </div>

          {callStatus === 'idle' && (
            <button className={styles.callButton} onClick={startCall}>
              <span className={styles.phoneIcon}>📞</span>
              Start Call
            </button>
          )}

          {(callStatus === 'connecting' || callStatus === 'active') && (
            <button className={`${styles.callButton} ${styles.endCall}`} onClick={endCall}>
              <span className={styles.phoneIcon}>📞</span>
              End Call
            </button>
          )}

          {callStatus === 'active' && (
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot}></span>
              {transcript ? transcript : 'Listening...'}
            </div>
          )}
        </div>

        <div className={styles.messagesContainer}>
          <h2 className={styles.messagesTitle}>Conversation</h2>
          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Start a call to begin the conversation</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageRole}>
                      {msg.role === 'user' ? '👤 You' : '🤖 Agent'}
                    </span>
                    <span className={styles.messageTime}>
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.messageContent}>{msg.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎤</span>
            <span>Voice Recognition</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🔊</span>
            <span>Text-to-Speech</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🤖</span>
            <span>AI Powered</span>
          </div>
        </div>
      </div>
    </main>
  )
}
