import Button from "../Button";

function ContactHeroContent() {
    return (
        <div className="flex flex-wrap gap-6 mt-8 lg:justify-center">
            <Button href="mailto:info@green-ecolution.de" ariaLabel="Kontaktiere uns gern per Mail" isDark>
                <img
                    src="/assets/svg/socials/mail.svg"
                    className="w-6 h-6" alt="" loading="lazy"/>
                <span>Kontakt</span>
            </Button>
            <Button href="https://github.com/SmartCityFlensburg" ariaLabel="Besuche uns auf GitHub" isExternalLink isDark>
                <img
                    src="/assets/svg/socials/github.svg"
                    className="w-6 h-6" alt="" loading="lazy"/>
                <span>GitHub</span>
            </Button>
        </div>
    );
}

export default ContactHeroContent;
