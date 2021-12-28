import './Footer.css';
import {BugReportLink,CopyRightTag,SourceLink} from '../Shared/Links';

function Footer() {
    return (
        <footer>
            <ul>
                <li><CopyRightTag /></li>
                <li><SourceLink text="Source" /></li>
                <li><BugReportLink text="Report Bugs" /></li>
            </ul>
        </footer>
    )
}

export default Footer;