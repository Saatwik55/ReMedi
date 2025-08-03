import React from 'react';

const MessageBubble = ({ sender, text, center }) => {
  const isBot = sender === 'bot';

  return (
    <div className={`flex ${center ? 'justify-center' : isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`px-4 py-2 rounded-xl max-w-xs ${
          center 
            ? 'bg-blue-100 text-gray-800 text-center'
            : isBot 
              ? 'bg-blue-100 text-gray-800 text-left' 
              : 'bg-blue-500 text-white text-right'
        }`}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
