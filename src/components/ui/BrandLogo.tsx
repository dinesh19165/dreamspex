import { Link, useNavigate } from 'react-router-dom';

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
	const navigate = useNavigate();
	const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		navigate('/');
		window.scrollTo(0, 0);
	};

	return (
		<Link
			to="/"
			onClick={handleLogoClick}
			className="inline-flex shrink-0 items-center justify-center overflow-visible bg-transparent p-0 no-underline"
			style={{
				display: 'inline-flex',
				width: compact ? 'clamp(120px, 18vw, 150px)' : 'clamp(160px, 24vw, 185px)',
				height: '74px',
				padding: '0 0.25rem',
			}}
			aria-label="Dream Spex Solutions Pvt Ltd home"
		>
			<img
				src="/assets/images/dream-spex-logo.png"
				alt="Dream Spex Solutions Pvt Ltd"
				style={{
					display: 'block',
					width: compact ? 'clamp(120px, 18vw, 150px)' : 'clamp(160px, 24vw, 185px)',
					height: 'auto',
					objectFit: 'contain',
					background: 'transparent',
				}}
			/>
		</Link>
	);
}
