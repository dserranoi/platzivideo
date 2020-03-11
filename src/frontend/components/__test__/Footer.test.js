import React from 'react';
import { create } from 'react-test-renderer';
import { render, shallow, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import Footer from '../Footer';

configure({ adapter: new Adapter() })


describe('Footer Testing', () => {
    test('Match Snapshot', () => {
        const footer = create(<Footer />);
        expect(footer.toJSON()).toMatchSnapshot();
    });

    test('footer has class .footer', () => {
        const footer = shallow(<Footer />);
        const footerElem = footer.find('footer');
        expect(footerElem.hasClass('footer')).toBe(true);
    });
    
    test('footer has  anchor tags', () => {
        const footer = shallow(<Footer />);
        expect(footer.find('a')).toHaveLength(3);
    });
});