import ChatBot from '../components/ChatBot';

const ChatPage = () => {
  return (
    <div className="flex h-screen w-screen bg-gray-100">
      {/* Sidebar placeholder */}
      {/* <Sidebar /> */}

      {/* Chat window centered */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col">
          <ChatBot />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
