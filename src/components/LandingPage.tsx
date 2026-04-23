import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChefHat, 
  Baby, 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  X
} from 'lucide-react';
import { 
  signInWithGoogle, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  auth,
  updateProfile
} from '../firebase';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

export default function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please disable AdBlockers/Brave Shields, and try doing a Hard Refresh.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please disable AdBlockers/Brave Shields, and try doing a Hard Refresh.');
      } else {
        setError(err.message || 'Google authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] dark:bg-stone-950 text-[#4a4a4a] dark:text-stone-300 font-sans selection:bg-orange-100 dark:bg-orange-950/40">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/60 dark:bg-stone-950/60 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold font-serif tracking-tight">Mumify AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-stone-600 dark:text-stone-400">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 dark:text-orange-400 transition-colors">Features</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 dark:text-orange-400 transition-colors">How it Works</button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 dark:text-orange-400 transition-colors">Testimonials</button>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-2.5 rounded-full font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-16 md:pt-48 md:pb-32 grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-bold mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Nutrition for Modern Mothers
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] mb-8 text-stone-900 dark:text-stone-50 tracking-tight">
            Nurture yourself and your child <br />
            <span className="text-orange-600 dark:text-orange-400 italic font-serif font-normal">effortlessly.</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-600 dark:text-stone-400 mb-12 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Mumify AI turns your local inventory into budget-friendly, pregnancy-safe meal plans in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto bg-orange-600 text-white px-10 py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 active:scale-95"
            >
              Start Your Free Plan
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[
                  "https://www.image2url.com/r2/default/images/1776877908712-f6e579d3-415d-4b2a-8a0c-4c078eba5398.png",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
                  "https://www.image2url.com/r2/default/images/1776876489486-07b3f1f5-fe3d-4506-a0c7-551d5596b07f.jpg"
                ].map((src, i) => (
                  <img 
                    key={i}
                    src={src} 
                    className="w-12 h-12 rounded-full border-4 border-white object-cover shadow-sm"
                    alt="User"
                  />
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-50">200+ moms</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">trust Mumify AI</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-lg">
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl rotate-2 relative z-10">
              <img 
                src="https://www.image2url.com/r2/default/images/1776876489486-07b3f1f5-fe3d-4506-a0c7-551d5596b07f.jpg" 
                className="w-full h-full object-cover"
                alt="Beautiful African pregnant woman smiling"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Floating Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="absolute -bottom-10 -left-10 bg-white dark:bg-stone-900/60 p-6 rounded-[2rem] shadow-2xl max-w-[260px] -rotate-3 border border-stone-100 dark:border-stone-800 z-20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center">
                  <Baby className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <span className="font-extrabold text-stone-900 dark:text-stone-50 text-sm">Pregnancy Safetly On</span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                "Your baby and you."
              </p>
            </motion.div>

            {/* Decorative element */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-orange-100 dark:bg-orange-950/40 rounded-full blur-3xl opacity-60 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-pink-100 dark:bg-pink-950/40 rounded-full blur-3xl opacity-40 -z-10" />
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-white dark:bg-stone-900/60 py-24 border-y border-stone-100 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 text-stone-900 dark:text-stone-50">Designed for your journey</h2>
            <p className="text-stone-600 dark:text-stone-400 font-medium">We handle the complexity of nutrition so you can focus on what matters most.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Heart className="text-red-500" />,
                title: "Nutriention Focused",
                desc: "Every plan is optimized for the specific needs of your trimester, rich in folate and iron."
              },
              {
                icon: <ShieldCheck className="text-blue-500" />,
                title: "Safety First",
                desc: "Automatic warnings for foods that aren't safe during pregnancy."
              },
              {
                icon: <ChefHat className="text-orange-500" />,
                title: "Zero Waste",
                desc: "We prioritize ingredients you already have to save you money and reduce food waste."
              }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 hover:border-orange-200 transition-colors">
                <div className="w-12 h-12 bg-white dark:bg-stone-900/60 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-stone-900 dark:text-stone-50">{f.title}</h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-[#fdfaf6] dark:bg-stone-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 text-stone-900 dark:text-stone-50">How Mumify AI Works</h2>
            <p className="text-stone-600 dark:text-stone-400 font-medium">In just 4 simple steps, get personalized help that help you grow healthly.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-12 text-center">
            {[
              {
                step: "1",
                title: "Tell us about you",
                desc: "Set your pregnancy status, budget, and dietary preferences in seconds."
              },
              {
                step: "2",
                title: "Scan your fridge",
                desc: "Just take a picture of what you have. Our AI identifies your ingredients instantly."
              },
              {
                step: "3",
                title: "Get your meal plan",
                desc: "Receive delicious, pregnancy-safe recipes tailored to your trimester."
              },
              {
                step: "4",
                title: "Get Sponsored",
                desc: "Receive help from anonymous philanthropists for safe delivery."
              }
            ].map((item, index) => (
              <div key={index} className="relative flex flex-col items-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold font-serif text-2xl flex items-center justify-center rounded-full mb-6 z-10 shadow-sm border-4 border-white">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-stone-900 dark:text-stone-50">{item.title}</h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-orange-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 text-stone-900 dark:text-stone-50">Loved by mothers</h2>
            <p className="text-stone-600 dark:text-stone-400 font-medium">Hear how Mumify AI is making pregnancy easier for women everywhere.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[2rem] bg-orange-50 dark:bg-orange-950/20 border border-orange-100">
              <div className="flex text-orange-500 mb-4">
                {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 mr-1" />)}
              </div>
              <p className="text-stone-700 dark:text-stone-300 italic text-lg leading-relaxed mb-6">
                "Mumify AI has been a lifesaver. I was so exhausted during my first trimester, and knowing what to eat when I felt nauseous was overwhelming. It planned my meals and kept me on budget!"
              </p>
              <div className="flex items-center gap-4">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScmBK8rRnhYB0d0glJyWHrTtMgrtI4ZzM-0g&s" className="w-12 h-12 rounded-full object-cover" alt="Sarah T." />
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-50">Sarah Tejumola.</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">1st Trimester</p>
                </div>
              </div>
            </div>
            <div className="p-8 rounded-[2rem] bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
              <div className="flex text-orange-500 mb-4">
                {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 mr-1" />)}
              </div>
              <p className="text-stone-700 dark:text-stone-300 italic text-lg leading-relaxed mb-6">
                "As a working mom expecting my second child, I have zero time to meal prep. Scanning my pantry and getting instant safe recipes is literally magic."
              </p>
              <div className="flex items-center gap-4">
                <img src="https://www.image2url.com/r2/default/images/1776876489486-07b3f1f5-fe3d-4506-a0c7-551d5596b07f.jpg" alt="Adewale Sophia" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-50">Adewale Sophia.</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400">3rd Trimester</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="bg-orange-600 py-24 px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-700 rounded-full blur-3xl opacity-50"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">
            Be the First to Experience the Future of Maternal Nutrition
          </h2>
          <p className="text-orange-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Join our exclusive waitlist today and get early access, priority feature requests, and early-bird lifetime discounts.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto" onSubmit={(e) => { e.preventDefault(); alert('You have been added to the waitlist!'); }}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              required 
              className="flex-1 px-6 py-4 rounded-full text-stone-900 dark:text-stone-50 border-none outline-none ring-2 ring-transparent focus:ring-stone-900 transition-all" 
            />
            <button 
              type="submit" 
              className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-4 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-lg active:scale-95"
            >
              Join Waitlist
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-16 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-stone-800 pb-12">
          <div className="md:col-span-1">
            <div className="flex flex-row items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold font-serif text-2xl tracking-tight">Mumify AI</span>
            </div>
            <p className="text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
              Empowering mothers with intelligent, effortless nutrition planning for every stage of pregnancy and early motherhood.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-xs">Platform</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Testimonials</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-xs">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors">Pregnancy Nutrition Guide</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Lactation Diet Tips</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Infant Weaning Guide</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-xs">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium">
          <p>© 2026 Mumify AI. All Rights Reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900/60 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-500 dark:text-stone-400 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-8 pt-2">
                <h2 className="text-3xl font-bold font-serif mb-2 text-stone-900 dark:text-stone-50">
                  {isLogin ? 'Welcome Back' : 'Join Mumify AI'}
                </h2>
                <p className="text-stone-500 dark:text-stone-400">
                  {isLogin ? 'Sign in to continue your journey' : 'Start your personalized nutrition plan'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLogin && (
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-4 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200 dark:border-stone-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-stone-900/60 text-stone-400 font-medium">Or continue with</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-stone-50 dark:bg-stone-950 transition-all active:scale-95 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Google
              </button>

              <p className="mt-8 text-center text-stone-500 dark:text-stone-400 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
