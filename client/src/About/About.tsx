import React from 'react';
import './About.css';

function About(){
    const download_uri = '/addon-download';
    const full_about_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator/blob/main/README.md';
    return(
        <div>
            <span>About</span>

            <span>Known Issues</span>

            <span>Links</span>

            <a href={full_about_uri}>Full Readme [github]</a>
            <a href={download_uri}>Download Addon</a>
        </div>
    )
}

export default About;