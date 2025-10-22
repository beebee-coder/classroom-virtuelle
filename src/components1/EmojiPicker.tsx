"use client";

import { Card, CardContent } from "./ui/card";

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '💡', '🤔'];

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    return (
        <Card className="shadow-lg">
            <CardContent className="p-2">
                <div className="grid grid-cols-5 gap-1">
                    {EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => onEmojiSelect(emoji)}
                            className="text-2xl rounded-md p-1 hover:bg-accent transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
