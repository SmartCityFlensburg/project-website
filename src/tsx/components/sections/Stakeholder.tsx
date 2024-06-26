import { Splide, SplideSlide } from '@splidejs/react-splide';
import { i18nTranslated } from '../../helper/sliderTranslations';
import '@splidejs/react-splide/css';
import StakeholderCard from '../cards/StakeholderCard';

interface StakeholderProps {
    hasDesktopList?: boolean;
}

const Stakeholder: React.FC<StakeholderProps> = ({ hasDesktopList = false }) => {
    const stakeholder = [
        {
            label: "Hochschule Flensburg",
            url: "https://hs-flensburg.de/",
            image: "/assets/images/logo/hochschule-flensburg.png",
            description: "Occaecat sit anim nulla enim mollit elit in aliquip. Eu incididunt laboris voluptate adipisicing eiusmod veniam officia eiusmod tempor ess."
        },
        {
            label: "Smarte Grenzregion",
            url: "https://smarte-grenzregion.de/",
            image: "/assets/images/logo/smarte-grenzregion.png",
            description: "Occaecat sit anim nulla enim mollit elit in aliquip. Eu incididunt laboris voluptate adipisicing."
        },
        {
            label: "TBZ Flensburg",
            url: "https://www.tbz-flensburg.de/",
            image: "/assets/images/logo/tbz.png",
            description: "Occaecat sit anim nulla enim mollit elit in aliquip. Eu incididunt laboris voluptate adipisicing eiusmod veniam officia eiusmod tempor ess."
        }
    ];

    const breakpoints = {
		1024: {
			destroy: true,
		},
    }

    return (
        <section className={`max-w-208 mx-auto pt-28 mb-28 lg:pt-36 lg:mb-36 xl:pt-52 xl:mb-52 ${hasDesktopList ? 'lg:max-w-screen-lg' : '' }`}>
            <article className={`px-4 mb-8 md:px-6 lg:mb-14 ${hasDesktopList ? 'lg:text-center' : '' }`}>
                <h2 className="font-lato font-bold text-2xl mb-6 lg:text-3xl">
                    Wer sind die Beteiligten?
                </h2>
                <p>
                    Id commodo eiusmod est culpa voluptate duis ipsum sint reprehenderit cupidatat elit qui enim.
                    Culpa exercitation sunt nisi magna tempor est ut duis consectetur consectetur pariatur irure ea aliqua.
                    Incididunt voluptate ad adipisicing excepteur laborum voluptate ut deserunt deserunt cillum mollit.
                    Ea sit nulla occaecat proident cupidatat laborum. Ipsum esse elit cillum tempor in consequat duis ullamco.
                </p>
            </article>

            <Splide
                options={{ rewind: true, arrows: false, i18n: i18nTranslated, mediaQuery: 'min', ...(hasDesktopList && { breakpoints: breakpoints }) }}
                aria-label="Beteiligten am Projekt"
            >
                {stakeholder.map((company, index) => (
                    <SplideSlide key={index} className="pb-10 px-4 md:px-6">
                        <StakeholderCard label={company.label} url={company.url} image={company.image} hasDesktopList>
                            <p className="my-4 md:my-5">
                                {company.description}
                            </p>
                        </StakeholderCard>
                    </SplideSlide>
                ))}
            </Splide>
        </section>
    );
};

export default Stakeholder;
