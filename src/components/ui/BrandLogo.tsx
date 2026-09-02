import { Link } from 'react-router-dom';

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
	return (
		<Link to="/" className="inline-flex shrink-0 items-center rounded-xl bg-white px-2 py-1" aria-label="Dream Spex Solutions Pvt Ltd home">
			<img src="/assets/images/dream-spex-logo.svg" alt="Dream Spex Solutions Pvt Ltd" className={compact ? 'h-10 w-32 object-contain' : 'h-14 w-52 object-contain'} />
		</Link>
	);
}
