import { Function } from "ai";
import uniq from "lodash/uniq";
import {
  ActionProperty,
  ACTION_PROPERTIES,
  actionFunctionDefs,
} from "@/utils/ai/actions";
import { REQUIRES_MORE_INFO } from "@/utils/ai/choose-rule/consts";
import { AI_GENERATED_FIELD_VALUE } from "@/utils/config";
import { RuleWithActions } from "@/utils/types";

// This finds the properties that must be generated by the AI.
// NOTE: if two actions require the same field, the AI will generate the same value for both.
// For example, if two actions require the "content" field, the AI will generate the same content for both.

// We probably want to improve this in the future. So that action1.content and action2.content are different.
export function getFunctionsFromRules(options: { rules: RuleWithActions[] }) {
  const rulesWithProperties = options.rules.map((rule, i) => {
    const toAiGenerateValues: ActionProperty[] = [];

    rule.actions.forEach((action) => {
      ACTION_PROPERTIES.forEach((property) => {
        if (action[property] === AI_GENERATED_FIELD_VALUE) {
          toAiGenerateValues.push(property);
        }
      });
    });

    const shouldAiGenerateArgs = toAiGenerateValues.length > 0;

    return {
      rule,
      shouldAiGenerateArgs,
      name: `rule_${i + 1}`,
      description: rule.instructions,
      parameters: {
        type: "object",
        properties: rule.actions.reduce(
          (properties, action) => {
            const actionProperties = {
              ...actionFunctionDefs[action.type].parameters.properties,
            };

            return { ...properties, ...actionProperties };
          },
          {} as {
            [key: string]: {
              type: string;
              description: string;
            };
          },
        ),
        required: uniq(
          rule.actions.flatMap((action) => {
            return actionFunctionDefs[action.type].parameters.required;
          }),
        ),
      },
    };
  });

  rulesWithProperties.push({
    name: REQUIRES_MORE_INFO,
    description: "Request more information to handle the email.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    shouldAiGenerateArgs: false,
    rule: {} as any,
  });

  const functions: Function[] = rulesWithProperties.map((r) => ({
    name: r.name,
    description: r.description,
    parameters: r.parameters,
  }));

  return { functions, rulesWithProperties };
}
