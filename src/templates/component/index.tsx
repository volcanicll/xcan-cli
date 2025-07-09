import React from 'react';
import './style.css';

interface MyComponentProps {
  name: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ name }) => {
  return (
    <div className="my-component">
      <h1>Hello, {name}!</h1>
      <p>This is a reusable React component.</p>
    </div>
  );
};

export default MyComponent;
