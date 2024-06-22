import React from 'react';
import Arrow from '../../icons/Arrow';
import Lottie from 'lottie-react';
import logoAnimation from '../../../json/logoAnimation.json';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface WelcomeCardProps {
    isVisible: boolean;
    onClose: () => void;
    handleStartAnmiation: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ isVisible, onClose, handleStartAnmiation }) => {
    const ref = useOutsideClick(() => onClose());

    const handleHideWelcomeCard = () => {
        isVisible = false;
        handleStartAnmiation();
    };

    return (
        <article
            ref={ref}
            className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-opacity ease-in-out duration-500 delay-3000
                ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="relativen text-center bg-white shadow-md rounded-2xl p-8 border border-grey-100 w-[44rem]">
                <figure className="w-28 mx-auto mb-6">
                    <Lottie animationData={logoAnimation} />
                </figure>
                <h2 className="font-lato font-semibold text-2xl mb-4">
                    Willkommen auf der Projektseite von
                    <span className="text-green-dark-900"> Green Ecolution</span>
                </h2>
                <p className="text-base">
                    Bei diesem Projekt handelt es sich um ein Forschungsprojekt der Hochschule Flensburg. Master-Studierende untersuchen dabei, wie
                    smartes Grünflächenmanagement in der Stadt Flensburg aussehen kann. Start Sie die Animation, um mehr über das Vorgehen herauszufinden.
                </p>
                <button
                    className="mx-auto mt-6 text-sm flex items-center justify-center gap-x-4 rounded-2xl w-max font-semibold px-4 py-1.5 group bg-green-dark-900 transition-color ease-in-out duration-300 text-white hover:bg-green-light-900 hover:border-green-light-900"
                    onClick={handleHideWelcomeCard}
                >
                    Animation starten
                    <Arrow classes="w-6 transition-all ease-in-out duration-300 group-hover:translate-x-0.5" />
                </button>
            </div>
    </article>
    );
};

export default WelcomeCard;
