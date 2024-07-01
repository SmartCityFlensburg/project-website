import { useState, useEffect } from "react";
import Arrow from "../../icons/Arrow";
import HomepageOverlay from "./HomepageOverlay";
import HomepageHeroTrees from "./HomepageHeroTrees";
import { setCookie, hasCookie } from "../../helper/cookies";

function HomepageHero() {
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(false);
    const handleOpenOverlay = () => { setIsOverlayVisible(true) };

    const handleCloseOverlay = () => {
        setIsOverlayVisible(false);

        if (isInitialLoad) {
            setIsInitialLoad(false);
            setCookie('green_ecolution_initial_load');
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.matchMedia('(max-width: 1279px)').matches) {
                setIsOverlayVisible(false);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        isOverlayVisible
        ? bodyLock()
        : document.body.classList.remove('overflow-hidden');

        return () => { document.body.classList.remove('overflow-hidden') };
    }, [isOverlayVisible]);

    useEffect(() => {
        if (! hasCookie('green_ecolution_initial_load')
                && ! isOverlayVisible
                && window.matchMedia('(min-width: 1280px)').matches
            ) {
            setIsInitialLoad(true);
            bodyLock();

            const timer = setTimeout(() => { setIsOverlayVisible(true) }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    function bodyLock() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.classList.add('overflow-hidden');
    }

    return (
        <section>
            <div className="overflow-hidden relative mx-auto w-screen h-screen max-w-screen-3xl before:bg-background-yellow-dot before:bg-cover before:w-4/5 before:h-[100vh] before:max-h-[45rem] before:absolute before:-right-4 before:bottom-0 before:-z-50 before:bg-no-repeat sm:before:-right-10 md:before:max-h-[70rem] 2xl:before:right-0 2xl:before:bg-contain">
                <article className={`max-w-208 mx-auto px-4 pt-28 mb-8 transition-all ease-in-out duration-500 md:px-6 lg:mb-14 lg:pt-36 lg:max-w-screen-lg xl:max-w-screen-xl xl:pt-44
                    ${isOverlayVisible ? 'xl:opacity-0' : 'opacity-100'}`}
                >
                    <div className="max-w-[30rem] 2xl:max-w-[40rem]">
                        <h1 className="font-lato font-bold text-2xl mb-6 lg:text-4xl xl:text-5xl">
                            Wir machen smarte Bewässerung von Bäumen und Beeten möglich!
                        </h1>
                        <p className="mb-4 lg:mb-6">
                            Ut cillum minim eu duis cupidatat culpa proident voluptate sint aute mollit nulla velit voluptate.
                            Consequat occaecat adipisicing culpa.
                        </p>
                        <button
                            className={`hidden items-center justify-center gap-x-4 rounded-2xl w-max font-semibold px-5 py-2 group bg-green-dark-900 transition-color ease-in-out duration-300 text-white hover:bg-green-light-900 hover:border-green-light-900
                                ${hasCookie('green_ecolution_initial_load') ? 'xl:flex' : '' }`}
                            onClick={handleOpenOverlay}
                        >
                            Animation abspielen
                            <Arrow classes="w-6 transition-all ease-in-out duration-300 group-hover:translate-x-2"/>
                        </button>
                    </div>
                </article>

                <HomepageHeroTrees />
            </div>

            <HomepageOverlay
                initialLoad={isInitialLoad}
                isOverlayVisible={isOverlayVisible}
                onClose={handleCloseOverlay} />
        </section>
    );
}

export default HomepageHero;
