
import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/storage'
import './Auth.css'

type AuthMode = 'login' | 'signup'
type SignupStep = 'details' | 'otp'

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [step, setStep] = useState<SignupStep>('details')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!supabase) {
      setMessage(
        'Supabase connection is missing. Check your project configuration.',
      )
      return
    }

    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (mode === 'signup') {
        if (step === 'details') {
          const { data, error } = await supabase.auth.signUp({
           email: normalizedEmail,
           password,
           options: {
           data: {
          full_name: fullName.trim(),
          },
  },
})

          if (error) throw error

          // Supabase may return an empty identities array when the
          // email already exists and duplicate-signup masking is enabled.
          if (
            data.user &&
            Array.isArray(data.user.identities) &&
            data.user.identities.length === 0
          ) {
            setMode('login')
            setStep('details')
            setPassword('')
            setOtp('')
            setMessage(
              'This email is already registered. Please sign in instead.',
            )
            return
          }

          if (data.session) {
            setMessage('Account created and email verified successfully!')
          } else {
            setStep('otp')
            setMessage('OTP sent to your email. Please check your inbox.')
          }
        } else {
          const { error } = await supabase.auth.verifyOtp({
            email: normalizedEmail,
            token: otp.trim(),
            type: 'signup',
          })

          if (error) throw error

          setMessage('Email verified and account created successfully!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (error) throw error

        setMessage('Signed in successfully!')
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    setMessage('')

    if (!supabase) {
      setMessage(
        'Supabase connection is missing. Check your project configuration.',
      )
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      })

      if (error) throw error

      setMessage('A new verification code has been sent to your email.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not resend OTP.',
      )
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setStep('details')
    setOtp('')
    setPassword('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <a className="auth-wordmark" href="#" aria-label="Margadarshi home">
          <span className="auth-brand">M</span>
          <span>
            margadarshi<span className="auth-brand-dot">.</span>
          </span>
        </a>
        <span className="auth-top-note">YOUR JOURNEY STARTS HERE</span>
      </header>

      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-pill">
            <span className="auth-live-dot" />
            YOUR PERSONAL GROWTH SPACE
          </div>

          <h1>
            Make your days
            <br />
            <span>count.</span>
          </h1>

          <p className="auth-description">
            Big goals begin with small steps. Build better habits, stay focused,
            and turn your everyday effort into meaningful progress.
          </p>

          <div className="auth-visual">
            <div className="auth-orbit auth-orbit-one" />
            <div className="auth-orbit auth-orbit-two" />

            <div className="auth-visual-center">
              <span className="auth-spark">✳</span>
              <span className="auth-center-m">M</span>
              <span className="auth-center-caption">GROW WITH PURPOSE</span>
            </div>

            <div className="auth-float auth-float-top">
              <span className="auth-float-icon">↗</span>
              <span>
                <strong>Progress, not perfection</strong>
                <small>One day at a time</small>
              </span>
            </div>

            <div className="auth-float auth-float-bottom">
              <span className="auth-check">✓</span>
              <span>
                <strong>Small steps add up</strong>
                <small>Consistency is your superpower</small>
              </span>
            </div>
          </div>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-icon">◎</span>
              <span>
                <strong>Build habits</strong>
                <small>Create your routine</small>
              </span>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">↗</span>
              <span>
                <strong>Track progress</strong>
                <small>See how far you go</small>
              </span>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">⌖</span>
              <span>
                <strong>Stay focused</strong>
                <small>Keep goals in sight</small>
              </span>
            </div>
          </div>
        </section>

        <section className="auth-form-side">
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-card-heading">
              <span className="auth-card-kicker">
                {mode === 'signup'
                  ? step === 'otp'
                    ? 'VERIFY YOUR EMAIL'
                    : 'GET STARTED FOR FREE'
                  : 'GOOD TO HAVE YOU BACK'}
              </span>

              <h2>
                {mode === 'signup'
                  ? step === 'otp'
                    ? 'Enter your OTP'
                    : 'Create your account'
                  : 'Welcome back'}
              </h2>

              <p>
                {mode === 'signup'
                  ? step === 'otp'
                    ? `Enter the verification code sent to ${email}.`
                    : 'Your next chapter starts with one step.'
                  : 'Sign in and pick up where you left off.'}
              </p>
            </div>

            {!(mode === 'signup' && step === 'otp') && (
              <>
              <label htmlFor="auth-name">Full Name</label>
              <input
               id="auth-name"
               type="text"
               autoComplete="name"
               required
               value={fullName}
               onChange={(event) => setFullName(event.target.value)}
               placeholder="Enter your full name"
/>
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </>
            )}

            {mode === 'signup' && step === 'otp' ? (
              <>
                <label htmlFor="auth-otp">Email verification code</label>
                <input
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))
                  }
                  placeholder="Enter 8-digit OTP"
                />

                <div className="auth-password-label">
                  <label htmlFor="auth-password">Create password</label>
                  <span>6+ characters</span>
                </div>

                <input
                  id="auth-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create your password"
                />

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Verifying…' : 'Verify OTP & create account'}
                  {!loading && <span aria-hidden="true"> →</span>}
                </button>

                <p className="auth-switch">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={resendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </p>

                <p className="auth-switch">
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setStep('details')
                      setOtp('')
                      setMessage('')
                    }}
                  >
                    Change email
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="auth-password-label">
                  <label htmlFor="auth-password">Password</label>
                  {mode === 'signup' && <span>6+ characters</span>}
                </div>

                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === 'signup' ? 'new-password' : 'current-password'
                  }
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === 'signup'
                      ? 'Create your password'
                      : 'Enter your password'
                  }
                />

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? 'Please wait…'
                    : mode === 'signup'
                      ? 'Send verification OTP'
                      : 'Sign in'}
                  {!loading && <span aria-hidden="true"> →</span>}
                </button>
              </>
            )}

            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-switch">
              {mode === 'signup'
                ? 'Already have an account?'
                : 'New to Margadarshi?'}{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() =>
                  switchMode(mode === 'signup' ? 'login' : 'signup')
                }
              >
                {mode === 'signup' ? 'Sign in' : 'Create account'}
              </button>
            </p>

            <p className="auth-terms">
              By continuing, you agree to use Margadarshi responsibly and keep
              your account credentials secure.
            </p>
          </form>

          <p className="auth-secure-note">
            <span>♧</span> Your journey, your progress, your space.
          </p>
        </section>
      </div>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Margadarshi</span>
        <span>DISCIPLINE, MEASURED.</span>
      </footer>
    </main>
  )
}
