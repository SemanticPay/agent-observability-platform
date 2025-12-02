import { AssistantMessageProps } from "@copilotkit/react-ui";
import { Markdown } from "@copilotkit/react-ui";
import { Loader } from "lucide-react";
export const CustomAssistantMessage = (props: AssistantMessageProps) => {
  const { message, isLoading, subComponent } = props;
  // message is a TextMessage object, extract the content string
  const content = typeof message === "string" ? message : message?.content || "";

  return (
    <div className="pb-4">
      {(content || isLoading) && 
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
            <Markdown content={content} />
            {isLoading && (
                <div className="flex items-center gap-2 text-xs text-blue-500">
                <Loader className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
                </div>
            )}
            </div>
        </div>
      }
      
      {subComponent && <div>{subComponent}</div> }
    </div>
  );
};
