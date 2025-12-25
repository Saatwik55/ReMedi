import { useState, useMemo, useEffect, useRef } from 'react';
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
  const [symptomState, setSymptomState] = useState({});

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
      immediate
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
        const init = {};
        data.symptom_candidates.forEach(s => init[s] = 0);
        setCurrentSymptomWeights(init);

        setSymptomCandidates(
          data.symptom_candidates.map(sym => ({
            symptom: sym,
            description: data.symptom_descriptions?.[sym] || "No description available"
          }))
        );
      }

      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.message || "🤖 Something went wrong."
      }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "⚠️ Failed to connect to ReMedi server."
      }]);
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

    const newlyAnswered = {};
    const confirmedReadable = [];

    for (const [sym, val] of Object.entries(currentSymptomWeights)) {
      newlyAnswered[sym] = val;
      if (val === 1) {
        confirmedReadable.push(capitalize(sym.replaceAll("_", " ")));
      }
    }

    if (confirmedReadable.length > 0) {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: `You have selected:\n${confirmedReadable.map(s => `• ${s}`).join("\n")}`
      }]);
    } else {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "Got it. You’re not experiencing any of these symptoms. Let me check what else might be relevant."
      }]);
    }

    const updatedState = { ...symptomState, ...newlyAnswered };
    setSymptomState(updatedState);

    try {
      const res = await fetch(`${server_url}/chatbot/extract_symptoms/next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          symptom_state: updatedState
        })
      });

      const data = await res.json();

      if (data.next_symptom) {
        setSlidersLocked(false);

        setSymptomCandidates([{
          symptom: data.next_symptom,
          description: data.description || "No description available"
        }]);

        setCurrentSymptomWeights({ [data.next_symptom]: 0 });

        setMessages(prev => [...prev, {
          sender: "bot",
          text: data.message ||
            `Do you experience '${capitalize(data.next_symptom.replace("_", " "))}'?`
        }]);

      } else if (data.predicted_disease) {
        setSlidersLocked(false);
        setSymptomCandidates([]);
        setCurrentSymptomWeights({});

        setMessages(prev => [...prev, {
          sender: "bot",
          text: `Based on your responses, I predict: ${data.predicted_disease}.`
        }]);
      } else {
        setSlidersLocked(false);
        setSymptomCandidates([]);

        setMessages(prev => [...prev, {
          sender: "bot",
          text: data.message || "Thanks. I’ve analyzed your symptoms."
        }]);
      }
    } catch {
      setSlidersLocked(false);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "⚠️ Failed to process your symptoms. Please try again."
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
        {showWelcome ? (
          <div className="text-center mt-24">{welcomeText}</div>
        ) : (
          <>
            {messages.map((m, i) => (
              <MessageBubble key={i} sender={m.sender} text={m.text} />
            ))}

            {symptomCandidates.length > 0 && !slidersLocked && (
              <div className="mt-6 max-w-sm mx-auto bg-white p-5 rounded-2xl shadow-lg">
                <h3 className="font-semibold text-center mb-3">
                  Please confirm if you experience these symptoms:
                </h3>

                {symptomCandidates.map((s, i) => (
                  <div key={i} className="flex justify-between items-center mb-3">
                    <HoverCard>
                      <HoverCardTrigger className="cursor-pointer font-medium">
                        {capitalize(s.symptom.replaceAll("_", " "))}
                      </HoverCardTrigger>
                      <HoverCardContent>{s.description}</HoverCardContent>
                    </HoverCard>

                    <div
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer ${currentSymptomWeights[s.symptom] ? 'bg-blue-600' : 'bg-gray-300'}`}
                      onClick={() => toggleSymptom(s.symptom)}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transform ${currentSymptomWeights[s.symptom] ? 'translate-x-6' : ''}`} />
                    </div>
                  </div>
                ))}

                <button
                  onClick={submitSymptomWeights}
                  className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg"
                >
                  Submit Symptoms
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <UploadButton />
        <div className="flex bg-white rounded-3xl p-3 shadow">
          <input
            className="flex-1 bg-transparent outline-none"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
          />
          <button onClick={sendMessage} className="ml-3 bg-blue-700 text-white px-5 py-2 rounded-2xl">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
