/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  ChefHat, 
  Calendar, 
  Baby, 
  LogOut, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Utensils,
  Leaf,
  Link as LinkIcon,
  Search,
  BookOpen,
  MessageSquare,
  Send,
  Mic,
  Volume2,
  Image as ImageIcon,
  Paperclip,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  scanInventory, 
  generateMealPlan, 
  extractRecipeFromUrl,
  chatWithGemini,
  generateSpeech,
  ScannedItem, 
  MealPlanResponse,
  ExtractedRecipe
} from './services/geminiService';
import { cn } from './lib/utils';
import LandingPage from './components/LandingPage';
import ReactMarkdown from 'react-markdown';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPregnant, setIsPregnant] = useState(false);
  const [isNursing, setIsNursing] = useState(false);
  const [nursingChildAge, setNursingChildAge] = useState('');
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'planner' | 'recipes' | 'chat' | 'budget'>('inventory');
  
  const [recipeUrl, setRecipeUrl] = useState('');
  const [extractingRecipe, setExtractingRecipe] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);

  // Manual Add State
  const [manualItem, setManualItem] = useState({ name: '', category: 'Other', quantity: '' });
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Budget State
  const [budget, setBudget] = useState<{ amount: number, period: string } | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetForm, setBudgetForm] = useState({ amount: '', period: 'weekly' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '' });

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, image?: string }[]>([
    { role: 'model', text: "Hi! I'm Mumify AI. How can I help you with your nutrition today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    isPregnant: false,
    isNursing: false,
    nursingChildAge: '',
    budgetAmount: '100',
    budgetPeriod: 'weekly'
  });

  useEffect(() => {
    let unsubInventory: (() => void) | null = null;
    let unsubExpenses: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (unsubInventory) unsubInventory();
      if (unsubExpenses) unsubExpenses();

      setUser(u);
      if (u) {
        try {
          // Load user profile
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsPregnant(data.isPregnant || false);
            setIsNursing(data.isNursing || false);
            setNursingChildAge(data.nursingChildAge || '');
            setBudget(data.budget || null);
            if (data.budget) {
              setBudgetForm({ amount: data.budget.amount.toString(), period: data.budget.period });
            }
            if (!data.onboardingComplete) {
              setOnboardingData(prev => ({ ...prev, name: data.displayName || u.displayName || '' }));
              setShowOnboarding(true);
            }
          } else {
            // Create profile
            await setDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || '',
              isPregnant: false,
              isNursing: false,
              nursingChildAge: '',
              onboardingComplete: false,
              createdAt: serverTimestamp()
            });
            setOnboardingData(prev => ({ ...prev, name: u.displayName || '' }));
            setShowOnboarding(true);
          }

          // Subscribe to inventory
          const q = query(collection(db, 'users', u.uid, 'inventory'));
          unsubInventory = onSnapshot(q, (snapshot) => {
            setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }, (err) => console.error("Inventory error:", err));

          // Subscribe to expenses
          const expensesQ = query(collection(db, 'users', u.uid, 'expenses'));
          unsubExpenses = onSnapshot(expensesQ, (snapshot) => {
            const loadedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side to avoid needing an index immediately
            loadedExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExpenses(loadedExpenses);
          }, (err) => console.error("Expenses error:", err));

        } catch (error) {
           console.error("Error loading user data:", error);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
      if (unsubInventory) unsubInventory();
      if (unsubExpenses) unsubExpenses();
    };
  }, []);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const budgetAmount = parseFloat(onboardingData.budgetAmount);
    const newBudget = !isNaN(budgetAmount) && budgetAmount > 0 
      ? { amount: budgetAmount, period: onboardingData.budgetPeriod }
      : null;

    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: onboardingData.name,
        isPregnant: onboardingData.isPregnant,
        isNursing: onboardingData.isNursing,
        nursingChildAge: onboardingData.nursingChildAge,
        onboardingComplete: true,
        ...(newBudget ? { budget: newBudget } : {})
      }, { merge: true });

      setIsPregnant(onboardingData.isPregnant);
      setIsNursing(onboardingData.isNursing);
      setNursingChildAge(onboardingData.nursingChildAge);
      if (newBudget) {
        setBudget(newBudget);
        setBudgetForm({ amount: newBudget.amount.toString(), period: newBudget.period });
      }
      setShowOnboarding(false);
    } catch (err) {
      console.error("Error completing onboarding", err);
    }
  };

  const togglePregnancy = async () => {
    if (!user) return;
    const newVal = !isPregnant;
    setIsPregnant(newVal);
    await setDoc(doc(db, 'users', user.uid), { isPregnant: newVal }, { merge: true });
  };

  const toggleNursing = async () => {
    if (!user) return;
    const newVal = !isNursing;
    setIsNursing(newVal);
    await setDoc(doc(db, 'users', user.uid), { isNursing: newVal }, { merge: true });
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(budgetForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    
    const newBudget = { amount, period: budgetForm.period };
    await setDoc(doc(db, 'users', user.uid), { budget: newBudget }, { merge: true });
    setBudget(newBudget);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0 || !expenseForm.description) return;

    await addDoc(collection(db, 'users', user.uid, 'expenses'), {
      amount,
      description: expenseForm.description,
      date: new Date().toISOString()
    });
    setExpenseForm({ amount: '', description: '' });
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    const maxDim = 800; // max width/height to avoid Gemini size limits
    const scale = Math.min(1, maxDim / Math.max(videoWidth, videoHeight));
    
    canvasRef.current.width = videoWidth * scale;
    canvasRef.current.height = videoHeight * scale;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Use slightly compressed jpeg to reduce size further
    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    setScanning(true);
    stopCamera();

    try {
      const items = await scanInventory(base64Image);
      for (const item of items) {
        await addDoc(collection(db, 'users', user.uid, 'inventory'), {
          ...item,
          addedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'inventory', id));
  };

  const calculateTotalExpenses = () => {
    if (!budget) return 0;
    const now = new Date();
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      if (budget.period === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return expDate >= weekStart;
      } else {
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      }
    }).reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleGeneratePlan = async (duration: string) => {
    if (!user || inventory.length === 0) return;
    setGeneratingPlan(true);
    try {
      const itemNames = inventory.map(i => i.name);
      const plan = await generateMealPlan(itemNames, duration, isPregnant, isNursing, nursingChildAge);
      setMealPlan(plan);
      setActiveTab('planner');
    } catch (err) {
      console.error("Plan generation error:", err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleExtractRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeUrl) return;
    setExtractingRecipe(true);
    try {
      const recipe = await extractRecipeFromUrl(recipeUrl);
      setExtractedRecipe(recipe);
    } catch (err) {
      console.error("Recipe extraction error:", err);
    } finally {
      setExtractingRecipe(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualItem.name) return;
    await addDoc(collection(db, 'users', user.uid, 'inventory'), {
      ...manualItem,
      addedAt: serverTimestamp()
    });
    setManualItem({ name: '', category: 'Other', quantity: '' });
    setShowManualAdd(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || (!chatInput && !chatImage) || chatLoading) return;

    const userMessage = { role: 'user' as const, text: chatInput, image: chatImage || undefined };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatImage(null);
    setChatLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithGemini(
        userMessage.text, 
        history, 
        { isPregnant, isNursing, childAge: nursingChildAge },
        userMessage.image?.split(',')[1]
      );
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleVoiceRead = async (text: string) => {
    try {
      const base64Audio = await generateSpeech(text);
      // Try mp3 format, sometimes APIs return wav, browsers are usually lenient if base64 is passed,
      // but to be safe we will check if the Audio play promise rejects.
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      try {
        await audio.play();
      } catch (playError) {
        console.warn("Audio play failed (maybe wrong format), trying Native TTS...", playError);
        throw playError; // trigger the fallback in the outer catch block
      }
      
    } catch (err: any) {
      console.error("Gemini TTS error, falling back to browser TTS:", err);
      // Fallback to native browser speech synthesis to bypass credit limits or decoding errors
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } else {
        // Only show error if both Gemini and Native TTS fail
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: `🔈 Audio generation failed: ${err?.message || 'Unknown error'}` 
        }]);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && typeof (mediaRecorderRef.current as any).stop === 'function') {
        (mediaRecorderRef.current as any).stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    // Set to true so you can see the text stream as you speak
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setChatInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    mediaRecorderRef.current = recognition as any;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfaf6] dark:bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#fdfaf6] dark:bg-stone-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-stone-900/60 rounded-[2.5rem] p-10 shadow-2xl border border-stone-100 dark:border-stone-800">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-serif mb-2 text-stone-900 dark:text-stone-50 text-center">Welcome to Mumify</h2>
          <p className="text-stone-500 dark:text-stone-400 text-center mb-8">Let's set up your profile so we can give you the best experience.</p>
          
          <form onSubmit={handleCompleteOnboarding} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">What should we call you?</label>
              <input 
                type="text" 
                required
                placeholder="Your Name"
                value={onboardingData.name}
                onChange={(e) => setOnboardingData({...onboardingData, name: e.target.value})}
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Are you currently pregnant?</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setOnboardingData({...onboardingData, isPregnant: true})}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold border transition-all",
                    onboardingData.isPregnant ? "bg-orange-100 dark:bg-orange-950/40 border-orange-200 text-orange-700 dark:text-orange-300" : "bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:bg-stone-800"
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingData({...onboardingData, isPregnant: false})}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold border transition-all",
                    !onboardingData.isPregnant ? "bg-orange-100 dark:bg-orange-950/40 border-orange-200 text-orange-700 dark:text-orange-300" : "bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:bg-stone-800"
                  )}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Are you nursing/lactating a child?</label>
              <div className="flex gap-4 mb-3">
                <button
                  type="button"
                  onClick={() => setOnboardingData({...onboardingData, isNursing: true})}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold border transition-all",
                    onboardingData.isNursing ? "bg-pink-100 dark:bg-pink-950/40 border-pink-200 text-pink-700 dark:text-pink-300" : "bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:bg-stone-800"
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingData({...onboardingData, isNursing: false, nursingChildAge: ''})}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold border transition-all",
                    !onboardingData.isNursing ? "bg-pink-100 dark:bg-pink-950/40 border-pink-200 text-pink-700 dark:text-pink-300" : "bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:bg-stone-800"
                  )}
                >
                  No
                </button>
              </div>
              
              {onboardingData.isNursing && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <select
                    required
                    value={onboardingData.nursingChildAge}
                    onChange={(e) => setOnboardingData({...onboardingData, nursingChildAge: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    <option value="" disabled>Select child's age</option>
                    <option value="7 months">7 months</option>
                    <option value="8 months">8 months</option>
                    <option value="9 months">9 months</option>
                    <option value="10 months">10 months</option>
                    <option value="11 months">11 months</option>
                    <option value="12 months">1 year</option>
                    <option value="18 months">1.5 years</option>
                    <option value="24 months">2 years</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Do you have a grocery budget?</label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-bold">$</span>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Amount"
                    value={onboardingData.budgetAmount}
                    onChange={(e) => setOnboardingData({...onboardingData, budgetAmount: e.target.value})}
                    className="w-full pl-8 pr-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <select 
                  value={onboardingData.budgetPeriod}
                  onChange={(e) => setOnboardingData({...onboardingData, budgetPeriod: e.target.value})}
                  className="flex-1 px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-4 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-xl shadow-stone-200 mt-8"
            >
              Start using Mumify
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-700 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-serif">Mumify</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <button 
              onClick={toggleNursing}
              title={isNursing && nursingChildAge ? `Nursing Mode (${nursingChildAge})` : 'Toggle Nursing'}
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                isNursing ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
              )}
            >
              <Utensils className="w-4 h-4" />
              {isNursing ? (nursingChildAge || "Nursing On") : "Nursing Off"}
            </button>
            <button 
              onClick={togglePregnancy}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                isPregnant ? "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
              )}
            >
              <Baby className="w-4 h-4" />
              {isPregnant ? "Pregnancy Mode On" : "Pregnancy Mode Off"}
            </button>
            <button onClick={logOut} className="p-2 text-stone-400 hover:text-stone-600 dark:text-stone-400">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-stone-200/50 dark:bg-stone-800 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
              activeTab === 'inventory' ? "bg-white dark:bg-stone-900/60 text-stone-900 dark:text-stone-50 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300"
            )}
          >
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('planner')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
              activeTab === 'planner' ? "bg-white dark:bg-stone-900/60 text-stone-900 dark:text-stone-50 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300"
            )}
          >
            Meal Planner
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
              activeTab === 'recipes' ? "bg-white dark:bg-stone-900/60 text-stone-900 dark:text-stone-50 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300"
            )}
          >
            Recipe Extractor
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
              activeTab === 'chat' ? "bg-white dark:bg-stone-900/60 text-stone-900 dark:text-stone-50 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300"
            )}
          >
            AI Chat
          </button>
          <button 
            onClick={() => setActiveTab('budget')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
              activeTab === 'budget' ? "bg-white dark:bg-stone-900/60 text-stone-900 dark:text-stone-50 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300"
            )}
          >
            Budget
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'inventory' ? (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Your Fridge</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowManualAdd(true)}
                    className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-stone-200 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    Add Item
                  </button>
                  <button 
                    onClick={startCamera}
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95"
                  >
                    <Camera className="w-5 h-5" />
                    Scan Fridge
                  </button>
                </div>
              </div>

              {showManualAdd && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-stone-900/60 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm"
                >
                  <form onSubmit={handleManualAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                      type="text" 
                      placeholder="Item Name" 
                      required
                      value={manualItem.name}
                      onChange={(e) => setManualItem({...manualItem, name: e.target.value})}
                      className="md:col-span-2 px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <select 
                      value={manualItem.category}
                      onChange={(e) => setManualItem({...manualItem, category: e.target.value})}
                      className="px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option>Fruit</option>
                      <option>Vegetable</option>
                      <option>Dairy</option>
                      <option>Protein</option>
                      <option>Other</option>
                    </select>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Qty" 
                        value={manualItem.quantity}
                        onChange={(e) => setManualItem({...manualItem, quantity: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button type="submit" className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 p-2 rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200">
                        <Plus className="w-6 h-6" />
                      </button>
                      <button type="button" onClick={() => setShowManualAdd(false)} className="p-2 text-stone-400">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {inventory.length === 0 ? (
                <div className="bg-white dark:bg-stone-900/60 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Utensils className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-500 dark:text-stone-400 font-medium">Your inventory is empty. Start by scanning your fridge!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="bg-white dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-stone-50 dark:bg-stone-950 rounded-xl flex items-center justify-center text-2xl">
                          {item.category === 'Fruit' ? '🍎' : item.category === 'Vegetable' ? '🥦' : '📦'}
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 dark:text-stone-50">{item.name}</h3>
                          <p className="text-sm text-stone-500 dark:text-stone-400">{item.quantity} • {item.category}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'planner' ? (
            <motion.div 
              key="planner"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Meal Planner</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={startCamera}
                    className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-stone-200 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    Scan Fridge
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button 
                    disabled={generatingPlan || inventory.length === 0}
                    onClick={() => handleGeneratePlan('weekly')}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Weekly
                  </button>
                  <button 
                    disabled={generatingPlan || inventory.length === 0}
                    onClick={() => handleGeneratePlan('monthly')}
                    className="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 px-4 py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Monthly
                  </button>
                  <button 
                    disabled={generatingPlan || inventory.length === 0}
                    onClick={() => handleGeneratePlan('trimester')}
                    className="bg-orange-100 dark:bg-orange-950/40 text-orange-900 px-4 py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Baby className="w-4 h-4" />}
                    Trimester
                  </button>
                </div>
              </div>

              {mealPlan ? (
                <div className="space-y-6">
                  {/* Pregnancy Advice Banner */}
                  {mealPlan.pregnancyAdvice && (
                    <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 rounded-3xl p-6 flex gap-4">
                      <div className="w-12 h-12 bg-pink-100 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center shrink-0">
                        <Baby className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-pink-900 mb-1">Pregnancy Guidance</h4>
                        <p className="text-pink-800 text-sm leading-relaxed">{mealPlan.pregnancyAdvice}</p>
                      </div>
                    </div>
                  )}

                  {/* Seasonal Tips */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-3xl p-6 flex gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center shrink-0">
                      <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 mb-1">Seasonal Alternatives</h4>
                      <p className="text-emerald-800 text-sm leading-relaxed">{mealPlan.seasonalTips}</p>
                    </div>
                  </div>

                  {/* Suggested Dishes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mealPlan.dishes.map((dish, i) => {
                      const lowerDish = dish.toLowerCase();
                      const isStirFry = lowerDish.includes('stir-fry') || lowerDish.includes('stir fry') || lowerDish.includes('chicken');
                      
                      // Using a highly appetizing Unsplash image for Chicken Stir-Fry
                      const imgUrl = isStirFry 
                        ? "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80" 
                        : `https://picsum.photos/seed/${dish.replace(/\s+/g, '')}recipe/200/200`;

                      return (
                        <div key={i} className="bg-white dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center gap-4 hover:border-orange-200 transition-colors">
                          <img 
                            src={imgUrl}
                            alt={dish}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm border border-stone-100 dark:border-stone-800"
                          />
                          <span className="font-bold text-stone-800 dark:text-stone-200 flex-1 leading-snug">{dish}</span>
                          <div className="w-8 h-8 shrink-0 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full Plan */}
                  <div className="bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-3xl p-8 relative group">
                    <button 
                      onClick={() => handleVoiceRead(mealPlan.plan)}
                      title="Read Meal Plan Aloud"
                      className="absolute top-6 right-6 p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-orange-600 dark:text-orange-400 hover:border-orange-200 rounded-full shadow-sm transition-all active:scale-90"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-6 flex items-center gap-2">
                      <Utensils className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      Full Meal Plan
                    </h3>
                    <div className="prose prose-stone max-w-none text-stone-700 dark:text-stone-300 leading-relaxed prose-headings:font-serif prose-h2:text-orange-900 prose-a:text-orange-600 dark:text-orange-400">
                      <ReactMarkdown>{mealPlan.plan}</ReactMarkdown>
                    </div>

                    {mealPlan.childNutritionTable && (
                      <div className="mt-8 pt-8 border-t border-stone-200 dark:border-stone-700 relative group">
                        <button 
                          onClick={() => handleVoiceRead(`Child nutritional plan. ${mealPlan.childNutritionTable}`)}
                          title="Read Child Plan Aloud"
                          className="absolute right-0 top-8 -mt-2 p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:text-pink-400 hover:border-pink-200 rounded-full shadow-sm transition-all active:scale-90"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-pink-100 dark:bg-pink-950/40 rounded-xl flex items-center justify-center">
                            <Baby className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          </div>
                          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-serif">
                            Child Nutritional Plan
                          </h3>
                        </div>
                        <div className="prose prose-stone max-w-none text-stone-700 dark:text-stone-300 leading-relaxed prose-th:bg-stone-50 dark:bg-stone-950 prose-th:p-3 prose-th:border prose-th:border-stone-200 dark:border-stone-700 prose-td:p-3 prose-td:border prose-td:border-stone-200 dark:border-stone-700 prose-table:border-collapse prose-table:border-stone-200 dark:border-stone-700 prose-table:w-full">
                          <ReactMarkdown>{mealPlan.childNutritionTable}</ReactMarkdown>
                        </div>
                        
                        {mealPlan.childDietaryWarnings && (
                          <div className="mt-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 flex gap-4">
                            <div className="w-12 h-12 bg-amber-100/50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center shrink-0">
                              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">Dietary Warnings ({nursingChildAge})</h4>
                              <div className="text-amber-900 dark:text-amber-300/80 text-sm leading-relaxed prose prose-sm prose-amber max-w-none">
                                <ReactMarkdown>{mealPlan.childDietaryWarnings}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-stone-900/60 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-500 dark:text-stone-400 font-medium">No active plan. Generate one to get started!</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'recipes' ? (
            <motion.div 
              key="recipes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-stone-900/60 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-sm">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50 mb-2">Social Recipe Extractor</h2>
                <p className="text-stone-500 dark:text-stone-400 mb-8">Paste a link from TikTok, Instagram, or Facebook to get a clean, local version of the recipe.</p>
                
                <form onSubmit={handleExtractRecipe} className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type="url" 
                      placeholder="https://tiktok.com/@chef/video/..." 
                      required
                      value={recipeUrl}
                      onChange={(e) => setRecipeUrl(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={extractingRecipe || !recipeUrl}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all disabled:opacity-50"
                  >
                    {extractingRecipe ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    Extract Recipe
                  </button>
                </form>
              </div>

              {extractedRecipe && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-[2.5rem] overflow-hidden shadow-sm"
                >
                  <div className="bg-orange-600 p-8 text-white">
                    <h3 className="text-3xl font-bold font-serif mb-2">{extractedRecipe.title}</h3>
                    <div className="flex items-center gap-2 text-orange-100">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm font-medium">Extracted & Localized by Mumify AI</span>
                    </div>
                  </div>
                  <div className="p-8 grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-1">
                      <h4 className="font-bold text-stone-900 dark:text-stone-50 mb-4 uppercase tracking-wider text-sm">Ingredients</h4>
                      <ul className="space-y-3">
                        {extractedRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-3 text-stone-600 dark:text-stone-400 text-sm">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-8 p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">
                        <h4 className="font-bold text-stone-900 dark:text-stone-50 mb-2 text-xs uppercase tracking-wider">Nutritional Value</h4>
                        <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">{extractedRecipe.nutritionalValue}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 relative">
                      <button 
                        onClick={() => handleVoiceRead(`Recipe instructions for ${extractedRecipe.title}. ${extractedRecipe.instructions}`)}
                        title="Read Instructions Aloud"
                        className="absolute right-0 top-0 -mt-1 p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-orange-600 dark:text-orange-400 hover:border-orange-200 rounded-full shadow-sm transition-all active:scale-90"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <h4 className="font-bold text-stone-900 dark:text-stone-50 mb-4 uppercase tracking-wider text-sm">Instructions</h4>
                      <div className="prose prose-stone max-w-none text-stone-700 dark:text-stone-300 leading-relaxed prose-headings:font-serif prose-h3:text-orange-900 prose-li:my-1">
                        <ReactMarkdown>{extractedRecipe.instructions}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : activeTab === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-[600px] bg-white dark:bg-stone-900/60 rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
            >
              <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Mumify Assistant</h3>
                    <p className="text-xs text-stone-400">Always here to help</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed relative group shadow-sm",
                      msg.role === 'user' ? "bg-orange-600 text-white rounded-tr-none" : "bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 rounded-tl-none"
                    )}>
                      {msg.image && (
                        <img src={msg.image} alt="Upload" className="w-full max-w-[200px] rounded-xl mb-3 shadow-sm border border-black/10" />
                      )}
                      
                      {msg.role === 'model' ? (
                        <div className="prose prose-stone prose-sm max-w-none leading-relaxed prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      )}
                      
                      {msg.role === 'model' && (
                        <button 
                          title="Read Aloud"
                          onClick={() => handleVoiceRead(msg.text)}
                          className="absolute -right-2 -bottom-2 p-2.5 bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-orange-600 dark:text-orange-400 hover:border-orange-200 rounded-full shadow-sm transition-all z-10 active:scale-90"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-2xl rounded-tl-none">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                {chatImage && (
                  <div className="relative w-20 h-20 mb-4">
                    <img src={chatImage} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-orange-500" />
                    <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 p-1 rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <label className="p-3 text-stone-400 hover:text-orange-600 dark:text-orange-400 cursor-pointer transition-colors">
                    <ImageIcon className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <button 
                    type="button"
                    onClick={toggleRecording}
                    title={isRecording ? "Stop Recording" : "Start Voice Typing"}
                    className={cn(
                      "p-3 rounded-full transition-all flex items-center justify-center shrink-0",
                      isRecording ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 animate-pulse border border-red-200" : "text-stone-400 hover:text-orange-600 dark:text-orange-400 hover:bg-stone-100 dark:bg-stone-800"
                    )}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Ask anything..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button 
                    type="submit"
                    disabled={chatLoading || (!chatInput && !chatImage)}
                    className="bg-orange-600 text-white p-3 rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : activeTab === 'budget' ? (
            <motion.div 
              key="budget"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-stone-900/60 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-700 shadow-sm">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50 mb-6">Budget Tracker</h2>
                
                <form onSubmit={handleSaveBudget} className="flex flex-col md:flex-row gap-4 mb-8 p-6 bg-stone-50 dark:bg-stone-950 rounded-3xl border border-stone-100 dark:border-stone-800">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Set Budget Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-bold">$</span>
                      <input 
                        type="number" 
                        min="1"
                        step="0.01"
                        required
                        value={budgetForm.amount}
                        onChange={(e) => setBudgetForm({...budgetForm, amount: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Period</label>
                    <select 
                      value={budgetForm.period}
                      onChange={(e) => setBudgetForm({...budgetForm, period: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full md:w-auto bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-3 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all">
                      Save Budget
                    </button>
                  </div>
                </form>

                {budget && (
                  <div className="mb-12">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-stone-500 dark:text-stone-400 font-medium mb-1">Current {budget.period} spending</p>
                        <h3 className="text-4xl font-bold text-stone-900 dark:text-stone-50">
                          ${calculateTotalExpenses().toFixed(2)} <span className="text-xl text-stone-400 font-normal">/ ${budget.amount.toFixed(2)}</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-stone-500 dark:text-stone-400">
                          {((calculateTotalExpenses() / budget.amount) * 100).toFixed(0)}% Used
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          calculateTotalExpenses() > budget.amount ? "bg-red-50 dark:bg-red-950/300" : "bg-orange-500"
                        )}
                        style={{ width: `${Math.min((calculateTotalExpenses() / budget.amount) * 100, 100)}%` }}
                      />
                    </div>
                    {calculateTotalExpenses() > budget.amount && (
                      <p className="text-red-500 text-sm font-bold mt-2 flex items-center gap-1">
                        <X className="w-4 h-4" /> You have exceeded your budget!
                      </p>
                    )}
                  </div>
                )}

                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-4">Add Grocery Expense</h3>
                <form onSubmit={handleAddExpense} className="flex flex-col md:flex-row gap-4 mb-8">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-bold">$</span>
                    <input 
                      type="number" 
                      min="0.01"
                      step="0.01"
                      placeholder="Amount"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full pl-8 pr-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Description (e.g., Trader Joe's, Farmers Market)"
                    required
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="flex-[2] px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <button type="submit" className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Add
                  </button>
                </form>

                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-4">Recent Expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400 text-center py-8 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">No expenses recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between p-4 bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-2xl group hover:border-orange-200 transition-colors">
                        <div>
                          <p className="font-bold text-stone-900 dark:text-stone-50">{exp.description}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{new Date(exp.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-stone-900 dark:text-stone-50">${exp.amount.toFixed(2)}</span>
                          <button 
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-stone-300 hover:text-red-500 transition-colors p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={stopCamera}
              className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="relative w-full max-w-lg aspect-[3/4] bg-stone-900 rounded-3xl overflow-hidden shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none" />
              
              {/* Scanning Bounding Box Guide */}
              <div className="absolute inset-8 bottom-32 pointer-events-none">
                {/* Animated corner boundaries */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-orange-400 rounded-tl-3xl opacity-80" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-orange-400 rounded-tr-3xl opacity-80" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-orange-400 rounded-bl-3xl opacity-80" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-orange-400 rounded-br-3xl opacity-80" />
                
                {/* Subtle inner dashed guide */}
                <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-3xl" />
                
                {/* Scan line effect (using css gradient) */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50 blur-[1px] animate-[ping_3s_ease-in-out_infinite]" />
              </div>

              <div className="absolute inset-x-0 bottom-8 flex justify-center z-10">
                <button 
                  onClick={captureAndScan}
                  className="w-20 h-20 bg-white dark:bg-stone-900/60 hover:bg-stone-50 dark:bg-stone-950 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all group"
                >
                  <div className="w-16 h-16 border-4 border-stone-800 group-hover:border-orange-500 rounded-full transition-colors" />
                </button>
              </div>
            </div>
            <p className="text-white/80 font-medium mt-8 text-sm flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Position items within the guide
            </p>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          >
            <div className="bg-white dark:bg-stone-900/60 p-8 rounded-3xl max-w-xs w-full shadow-2xl">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 dark:text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">Analyzing Items</h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Our AI is identifying your food items...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Navigation (Mobile) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-700 px-6 py-3 md:hidden z-30">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "flex flex-col items-center gap-1",
              activeTab === 'inventory' ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <Utensils className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Fridge</span>
          </button>
          <button 
            onClick={() => setActiveTab('planner')}
            className={cn(
              "flex flex-col items-center gap-1",
              activeTab === 'planner' ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <ChefHat className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Planner</span>
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={cn(
              "flex flex-col items-center gap-1",
              activeTab === 'recipes' ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <LinkIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Links</span>
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex flex-col items-center gap-1",
              activeTab === 'chat' ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('budget')}
            className={cn(
              "flex flex-col items-center gap-1",
              activeTab === 'budget' ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Budget</span>
          </button>
        </div>
      </nav>
    </div>
  );
}


