import { AssistantMessageProps } from "@copilotkit/react-ui";
import { Markdown } from "@copilotkit/react-ui";
import { Loader2 } from "lucide-react";

export const CustomAssistantMessage = (props: AssistantMessageProps) => {
  const { message, isLoading, subComponent } = props;
  // message is a TextMessage object, extract the content string
  const content = typeof message === "string" ? message : message?.content || "";

  return (
    <div className="pb-4">
      {(content || isLoading) && 
        <div className="bg-[#F0FFFC] p-4 rounded-lg border border-[#ADC4C2] shadow-sm">
          <div className="text-sm text-[#000F0C]">
            <Markdown content={content} />
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#53706C]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
        </div>
      }
      
      {subComponent && <div>{subComponent}</div>}
    </div>
  );
};
