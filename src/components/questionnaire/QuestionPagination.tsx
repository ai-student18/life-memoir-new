
interface QuestionPaginationProps {
  currentQuestionIndex: number;
  questions: any[];
}

const QuestionPagination = ({ 
  currentQuestionIndex, 
  questions 
}: QuestionPaginationProps) => {
  return (
    <div className="flex justify-center">
      <div className="flex space-x-2">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === currentQuestionIndex
                ? "bg-[#FFD217]"
                : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionPagination;
