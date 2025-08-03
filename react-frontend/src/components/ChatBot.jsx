import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Slider } from "@/components/ui/slider";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import MessageBubble from './MessageBubble';
import UploadButton from './UploadButton';
import SplitText from './SplitText';
const server_url = import.meta.env.VITE_SERVER_URL;

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [symptomCandidates, setSymptomCandidates] = useState([]); // [{symptom, description, weight}]
  const [currentSymptomWeights, setCurrentSymptomWeights] = useState({});
  const [askedSymptoms, setAskedSymptoms] = useState([]);

  // Ref for the chat container to enable auto-scrolling
  const chatContainerRef = useRef(null);

  const welcomeText = useMemo(() => (
    <SplitText
      text="Hey! How are you feeling today?"
      className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl font-bold text-gray-800"
      delay={50}
      duration={0.5}
      ease="elastic.out"
      splitType="chars"
      from={{ opacity: 0, y: 12 }}
      to={{ opacity: 1, y: 0 }}
      immediate={true}
    />
  ), []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current && !showWelcome) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, symptomCandidates, showWelcome]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (showWelcome) setShowWelcome(false);

    const userMessage = { sender: 'user', text: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const res = await fetch(`${server_url}/chatbot/extract_symptoms/initial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ text: trimmed })
      });

      const data = await res.json();

      if (data.symptom_candidates) {
        // Initialize weights for all symptoms
        const initialWeights = {};
        data.symptom_candidates.forEach(sym => {
          initialWeights[sym] = 0.5;
        });
        setCurrentSymptomWeights(initialWeights);

        const formatted = data.symptom_candidates.map(sym => ({
          symptom: sym,
          description: data.symptom_descriptions?.[sym] || "No description available",
          weight: 0.5
        }));
        setSymptomCandidates(formatted);
      }

      const botMessage = {
        sender: 'bot',
        text: data.message || "🤖 Something went wrong."
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "⚠️ Failed to connect to ReMedi server."
      }]);
    }
  };

  const updateWeight = (index, value) => {
    const updated = [...symptomCandidates];
    updated[index].weight = value[0];
    setSymptomCandidates(updated);

    // Update the weights object
    const symptom = updated[index].symptom;
    setCurrentSymptomWeights(prev => ({
      ...prev,
      [symptom]: value[0]
    }));
  };

  const submitSymptomWeights = async () => {
    // Filter out symptoms with weight 0 (not experienced)
    const confirmedSymptoms = Object.entries(currentSymptomWeights)
      .filter(([symptom, weight]) => weight > 0)
      .reduce((acc, [symptom, weight]) => {
        acc[symptom] = weight;
        return acc;
      }, {});

    if (Object.keys(confirmedSymptoms).length === 0) {
      const botMessage = {
        sender: 'bot',
        text: "It looks like you're not experiencing any of these symptoms. Please describe your symptoms differently or let me know if you need help."
      };
      setMessages(prev => [...prev, botMessage]);
      setSymptomCandidates([]);
      return;
    }

    try {
      // Add confirmed symptoms to asked symptoms list
      setAskedSymptoms(prev => [...prev, ...Object.keys(confirmedSymptoms)]);

      const res = await fetch(`${server_url}/chatbot/extract_symptoms/next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ 
          symptom_weights: confirmedSymptoms,
          asked_symptoms: askedSymptoms
        })
      });

      const data = await res.json();

      if (data.next_symptom) {
        // Show the next symptom to confirm
        const nextSymptomData = {
          symptom: data.next_symptom,
          description: data.description || "No description available",
          weight: 0.5
        };
        
        setSymptomCandidates([nextSymptomData]);
        setCurrentSymptomWeights({ [data.next_symptom]: 0.5 });

        const botMessage = {
          sender: 'bot',
          text: data.message || `Do you experience '${data.next_symptom.replace('_', ' ')}'?`
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // No more symptoms to ask about
        const botMessage = {
          sender: 'bot',
          text: data.message || "Thank you for the information. Let me analyze your symptoms..."
        };
        setMessages(prev => [...prev, botMessage]);
        setSymptomCandidates([]);
      }
    } catch (err) {
      const botMessage = {
        sender: 'bot',
        text: "⚠️ Failed to process your symptoms. Please try again."
      };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Area - Scrollable */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide" 
        style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
      >
        {showWelcome ? (
          <div className="text-center mt-12 sm:mt-16 md:mt-20 lg:mt-24" style={{ paddingBottom: '60px' }}>
            {welcomeText}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                sender={msg.sender}
                text={msg.text}
                center={msg.center}
              />
            ))}

            {/* Symptom confirmation sliders */}
            {symptomCandidates.length > 0 && (
              <div className="mt-4 space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3">
                    Please rate how strongly you experience each symptom:
                  </h3>
                  {symptomCandidates.map((s, i) => (
                    <div key={i} className="mb-4 last:mb-0">
                      <div className="flex justify-between mb-2">
                        <HoverCard>
                          <HoverCardTrigger className="font-medium text-blue-600 hover:underline cursor-pointer">
                            {s.symptom.replaceAll('_', ' ')}
                          </HoverCardTrigger>
                          <HoverCardContent className="text-sm max-w-xs">
                            {s.description}
                          </HoverCardContent>
                        </HoverCard>
                        <span className="text-sm text-gray-500">
                          {s.weight === 0 ? 'Not experiencing' : `${Math.round(s.weight * 100)}% severity`}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={[s.weight]}
                        onValueChange={(val) => updateWeight(i, val)}
                        className="mb-2 w-48"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Not experiencing</span>
                        <span>Severe</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Submit Button */}
                  <div className="mt-6 text-center">
                    <button
                      onClick={submitSymptomWeights}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Submit Symptoms
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Bottom Section */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-4 space-y-3">
        {/* Upload Button */}
        <div>
          <UploadButton />
        </div>

        {/* Input Bar */}
        <div className="w-full">
          <div className="flex items-center bg-white rounded-2xl shadow-md px-4 py-3">
            <input
              className="flex-1 text-lg bg-transparent focus:outline-none"
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="ml-3 text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl text-lg"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;