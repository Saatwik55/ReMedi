import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import MessageBubble from './MessageBubble';
import UploadButton from './UploadButton';
import SplitText from './SplitText';

const server_url = import.meta.env.VITE_SERVER_URL;
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [symptomCandidates, setSymptomCandidates] = useState([]);
  const [currentSymptomWeights, setCurrentSymptomWeights] = useState({});
  const [askedSymptoms, setAskedSymptoms] = useState([]);
  const [slidersLocked, setSlidersLocked] = useState(false);

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

  useEffect(() => {
    if (chatContainerRef.current && !showWelcome) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, symptomCandidates, showWelcome]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (showWelcome) setShowWelcome(false);

    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
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
        const initialWeights = {};
        data.symptom_candidates.forEach(sym => initialWeights[sym] = 0);
        setCurrentSymptomWeights(initialWeights);

        const formatted = data.symptom_candidates.map(sym => ({
          symptom: sym,
          description: data.symptom_descriptions?.[sym] || "No description available",
        }));
        setSymptomCandidates(formatted);
      }

      setMessages(prev => [...prev, { sender: 'bot', text: data.message || "🤖 Something went wrong." }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "⚠️ Failed to connect to ReMedi server." }]);
    }
  };

  const toggleSymptom = (symptom) => {
    if (slidersLocked) return;
    setCurrentSymptomWeights(prev => ({
      ...prev,
      [symptom]: prev[symptom] ? 0 : 1
    }));
  };

  const submitSymptomWeights = async () => {
    setSlidersLocked(true);

    const confirmedSymptoms = Object.entries(currentSymptomWeights)
      .filter(([_, val]) => val > 0)
      .map(([sym]) => capitalize(sym.replaceAll("_", " ")));

    if (confirmedSymptoms.length > 0) {
      const listText = `You have selected:\n${confirmedSymptoms.map(s => `• ${s}`).join("\n")}`;
      setMessages(prev => [...prev, { sender: "bot", text: listText }]);
    }

    if (confirmedSymptoms.length === 0) {
      setSlidersLocked(false);
      setSymptomCandidates([]);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "It looks like you're not experiencing any of these symptoms. Please describe your symptoms differently or let me know if you need help."
      }]);
      return;
    }

    try {
      const updatedAsked = [...askedSymptoms, ...confirmedSymptoms.map(s => s.toLowerCase().replaceAll(" ", "_"))];
      setAskedSymptoms(updatedAsked);

      const res = await fetch(`${server_url}/chatbot/extract_symptoms/next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          symptom_weights: confirmedSymptoms.reduce((acc, s) => ({
            ...acc,
            [s.toLowerCase().replaceAll(" ", "_")]: 1
          }), {}),
          asked_symptoms: updatedAsked
        })
      });

      const data = await res.json();

      if (data.next_symptom) {
        setSlidersLocked(false);
        const nextSymptomData = {
          symptom: data.next_symptom,
          description: data.description || "No description available"
        };
        setSymptomCandidates([nextSymptomData]);
        setCurrentSymptomWeights({ [data.next_symptom]: 0 });

        setMessages(prev => [...prev, { sender: 'bot', text: data.message || `Do you experience '${capitalize(data.next_symptom.replace("_", " "))}'?` }]);
      } else if (data.predicted_disease) {
        setSlidersLocked(false);
        setSymptomCandidates([]);
        setCurrentSymptomWeights({});

        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `Based on your confirmed symptoms, I predict: ${data.predicted_disease}.`
        }]);
      } else {
        setSlidersLocked(false);
        setSymptomCandidates([]);
        setMessages(prev => [...prev, { sender: 'bot', text: data.message || "Thank you for the information. Let me analyze your symptoms..." }]);
      }
    } catch (err) {
      setSlidersLocked(false);
      setMessages(prev => [...prev, { sender: 'bot', text: "⚠️ Failed to process your symptoms. Please try again." }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-6 scrollbar-hide min-h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', background: 'transparent' }}
      >
        <div className="px-4 py-6 pb-8 space-y-6">
          {showWelcome ? (
            <div className="text-center mt-12 sm:mt-16 md:mt-20 lg:mt-24 pb-16">{welcomeText}</div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <MessageBubble key={index} sender={msg.sender} text={msg.text} center={msg.center} />
              ))}

              {symptomCandidates.length > 0 && !slidersLocked && (
                <div className="mt-4 space-y-4 max-w-sm mx-auto bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-white/50">
                  <h3 className="font-semibold text-gray-800 mb-3 text-center">
                    Please confirm if you experience these symptoms:
                  </h3>

                  {symptomCandidates.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl mb-2 border border-white/40">
                      <HoverCard>
                        <HoverCardTrigger className="font-medium text-gray-700 hover:underline cursor-pointer text-sm">
                          {capitalize(s.symptom.replaceAll("_", " "))}
                        </HoverCardTrigger>
                        <HoverCardContent className="text-sm max-w-xs">{s.description}</HoverCardContent>
                      </HoverCard>

                      <div
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300
                          ${currentSymptomWeights[s.symptom] ? 'bg-blue-600' : 'bg-gray-300'}`}
                        onClick={() => toggleSymptom(s.symptom)}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out
                            ${currentSymptomWeights[s.symptom] ? 'translate-x-6' : 'translate-x-0'}`}
                        ></div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 text-center">
                    <button
                      onClick={submitSymptomWeights}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer"
                    >
                      Submit Symptoms
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-100 px-4 pb-6 pt-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <UploadButton />
          <div className="flex items-center bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 px-5 py-3 transition-all hover:shadow-2xl hover:bg-white">
            <input
              className="flex-1 text-base bg-transparent focus:outline-none text-gray-800 placeholder-gray-500"
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="ml-3 text-white bg-blue-700 hover:bg-blue-800 px-6 py-2.5 rounded-2xl font-medium transition-all hover:scale-105 active:scale-95 shadow-md"
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
