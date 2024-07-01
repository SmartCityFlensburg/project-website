import { useState, useEffect, useCallback } from "react";
import Arrow from "../../icons/Arrow";
import HomepageOverlayIcons from "./HomepageOverlayIcons";
import WelcomeCard from "../cards/WelcomeCard";

interface Popup {
    label: string;
    shortName: string;
    description: JSX.Element;
}

interface HomepageOverlayProps {
    initialLoad: boolean;
    isOverlayVisible: boolean;
    onClose: () => void;
}

const popups: Popup[] = [
    {
        label: "Messung des Bewässerungsstand",
        shortName: "Bewässerungsstand",
        description: (
            <>
                Die Bodenfeuchte um den Wurzelballen herum wird in drei (30cm, 60cm und 90cm) unterschiedlichen Bodentiefen gemessen. Daraus lässt sich erschließen, wie feucht der Boden auch in tieferen Bodenschichten ist.
            </>
        ),
    },
    {
        label: "Übertragung der Daten",
        shortName: "Datenübertragung",
        description: (
            <>
                Die Daten werden mithilfe von öffentlichen LoRaWAN (Long Range Wide Area Network) Zugängen übermittelt.
            </>
        ),
    },
    {
        label: "Handlungsempfehlungen",
        shortName: "Handlungsempfehlungen",
        description: (
            <>
                Die gemessenen Sensordaten werden mittels wissenschaftlichen, mathematischen Daten interpretiert und in Empfehlungen umgewandelt. Dies wird alles auf ein Dashboard dargestellt.
                <a href="/projekt#vorteile" className="text-green-dark-900 underline underline-offset-2 transition-all ease-in-out duration-300 hover:text-green-light-900"> Zu den Vorteilen</a>
            </>
        ),
    },
];

const HomepageOverlay: React.FC<HomepageOverlayProps> = ({ initialLoad, isOverlayVisible, onClose }) => {
    const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const currentPopup = popups[currentPopupIndex];
    const delay = 1500;

    const startTimer = useCallback((callback: () => void, delay: number) => {
        const timer = setTimeout(callback, delay);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (initialLoad) return;
        setCurrentPopupIndex(0);
        return startTimer(() => setIsPopupVisible(true), delay);
    }, [isOverlayVisible, initialLoad, delay, startTimer]);

    useEffect(() => {
        if (!isOverlayVisible) setIsPopupVisible(false);
    }, [isOverlayVisible]);

    const handleNextClick = () => {
        currentPopupIndex < popups.length - 1
        ? setCurrentPopupIndex(currentPopupIndex + 1)
        : onClose();
    };

    const handleStartAnimation = () => {
        if (isOverlayVisible) {
            return startTimer(() => setIsPopupVisible(true), delay);
        }
    };

    return (
        <section
            className={`hidden fixed inset-0 transition-all ease-in-out duration-1500 xl:block
                ${isOverlayVisible ? 'bg-grey-900 bg-opacity-80 z-[100]' : 'bg-opacity-0 -z-10'
            }`}
        >
            <div className="relative mx-auto h-screen w-screen max-w-screen-3xl">

                <WelcomeCard
                    handleStartAnmiation={handleStartAnimation}
                    onClose={onClose}
                    delay={delay}
                    isOverlayVisible={isOverlayVisible}
                />

                <article
                    className={`absolute top-1/2 -translate-y-2/3 right-[15%] transition-opacity duration-500 ${
                        isPopupVisible && isOverlayVisible ? 'opacity-100 delay-1500' : 'opacity-0'
                    }`}
                >
                    <div className="relative bg-white shadow-md rounded-2xl p-6 border border-grey-100 w-[22.5rem] 2xl:p-8 2xl:w-[32rem]">
                        <span className="text-sm">
                            Info {currentPopupIndex + 1} von {popups.length}: {currentPopup.shortName}
                        </span>
                        <h2 className="font-lato font-semibold text-xl mb-4">{currentPopup.label}</h2>
                        <p className="text-base">{currentPopup.description}</p>
                        <button
                            className="mt-6 text-sm flex items-center justify-center gap-x-4 rounded-2xl w-max font-semibold px-4 py-1.5 group bg-green-dark-900 transition-color ease-in-out duration-300 text-white hover:bg-green-light-900 hover:border-green-light-900"
                            onClick={handleNextClick}
                        >
                            {currentPopupIndex < popups.length - 1 ? 'Weiter' : 'Schließen'}
                            <Arrow
                                classes={`w-6 transition-all ease-in-out duration-300 ${
                                    currentPopupIndex < popups.length - 1 ? "group-hover:translate-x-0.5" : ""
                                }`}
                            />
                        </button>
                    </div>

                    <button
                        aria-label="Popup schließen"
                        onClick={onClose}
                        className="absolute -right-8 -top-8 bg-white w-8 h-8 rounded-full flex items-center justify-center text-green-dark-900 transition-all ease-in-out duration-300 hover:bg-green-light-900 hover:text-white"
                    >
                        <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </article>

                <HomepageOverlayIcons
                    areIconsVisible={isPopupVisible && isOverlayVisible}
                    index={currentPopupIndex}
                    delay={delay} />
            </div>
        </section>
    );
}

export default HomepageOverlay;
