
export default function Footer() {
    return (
        <footer className="w-full py-6 mt-auto border-t border-gray-800 bg-black/90 backdrop-blur-sm text-center">
            <div className="flex flex-col items-center justify-center gap-1">
                <p className="text-[10px] text-gray-500 font-mono tracking-wider">
                    Powered by <span className="text-yellow-500 font-bold">SA Software & Network Solutions</span>
                </p>
                <p className="text-[10px] text-gray-600">
                    © 2025 All Rights Reserved • Licensed to <span className="text-gray-400 font-semibold">AT-Visions GmbH</span>
                </p>

                {/* Developer Credit (Ghost/Easter Egg style) */}
                <p className="text-[8px] text-gray-800 mt-2 hover:text-gray-600 transition-colors cursor-default">
                    Developed with 🤍 by Antigravity
                </p>
            </div>
        </footer>
    );
}
