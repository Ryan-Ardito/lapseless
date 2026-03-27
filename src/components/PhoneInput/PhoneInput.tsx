import { PhoneInput as IntlPhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { Input } from '@mantine/core';
import './PhoneInput.css';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (phone: string) => void;
  style?: React.CSSProperties;
}

export function PhoneInput({ label, value, onChange, style }: PhoneInputProps) {
  return (
    <Input.Wrapper label={label} style={style}>
      <IntlPhoneInput
        defaultCountry="us"
        value={value}
        onChange={onChange}
        className="mantine-phone-input"
      />
    </Input.Wrapper>
  );
}
